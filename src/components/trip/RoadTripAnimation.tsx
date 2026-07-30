import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FpsMeter } from "./FpsMeter";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";

import { ROUTE_PATH, WAYPOINTS, TOTAL_MILES } from "@/lib/trip-data";
import { UsaMap } from "./UsaMap";
import { RV } from "./RV";
import { Pin } from "./Pin";
import { DestinationIcon } from "./DestinationIcons";

const VIEW_W = 975;
const VIEW_H = 610;
// Base zoom so the map fills ~85-90% of the frame instead of the full viewBox.
// Continental-US center in the 975x610 viewBox (ignores the AK/HI inset corner).
const MAP_CX = 495;
const MAP_CY = 268;
const BASE_SCALE = 1.32;

type Stage =
  | "intro"
  | "reveal"
  | "zoomHome"
  | "driving"
  | "arrived"
  | "outro"
  | "done";

type EaseFn = (x: number) => number;
type ContKf = { t: number; v: number; ease?: EaseFn };
type StepKf<T> = { t: number; v: T };

type Timeline = {
  duration: number;
  camX: ContKf[];
  camY: ContKf[];
  camS: ContKf[];
  path: ContKf[];
  rvOp: ContKf[];
  stage: StepKf<Stage>[];
  visible: StepKf<number>[];
  moving: StepKf<0 | 1>[];
  title: StepKf<boolean>[];
};

function bezier(p1x: number, p1y: number, p2x: number, p2y: number): EaseFn {
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const bx =
        3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
      const dbx =
        3 * (1 - t) * (1 - t) * p1x +
        6 * (1 - t) * t * (p2x - p1x) +
        3 * t * t * (1 - p2x);
      if (Math.abs(dbx) < 1e-6) break;
      t = Math.max(0, Math.min(1, t - (bx - x) / dbx));
    }
    return (
      3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t
    );
  };
}

const easeCam = bezier(0.65, 0, 0.35, 1);
const easeDrive = bezier(0.45, 0.05, 0.35, 1);
const easeOut = bezier(0, 0, 0.35, 1);

function sampleCont(kfs: ContKf[], t: number): number {
  if (t <= kfs[0].t) return kfs[0].v;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t <= b.t) {
      const span = b.t - a.t;
      const p = span > 0 ? (t - a.t) / span : 1;
      const e = a.ease ? a.ease(p) : p;
      return a.v + (b.v - a.v) * e;
    }
  }
  return kfs[kfs.length - 1].v;
}

function sampleStep<T>(kfs: StepKf<T>[], t: number): T {
  let cur = kfs[0].v;
  for (const k of kfs) {
    if (t + 1e-6 >= k.t) cur = k.v;
    else break;
  }
  return cur;
}

function buildTimeline(segmentLens: number[]): Timeline {
  const camX: ContKf[] = [{ t: 0, v: MAP_CX }];
  const camY: ContKf[] = [{ t: 0, v: MAP_CY }];
  const camS: ContKf[] = [{ t: 0, v: BASE_SCALE }];
  const path: ContKf[] = [{ t: 0, v: 0 }];
  const rvOp: ContKf[] = [{ t: 0, v: 0 }];
  const stage: StepKf<Stage>[] = [{ t: 0, v: "intro" }];
  const visible: StepKf<number>[] = [{ t: 0, v: -1 }];
  const moving: StepKf<0 | 1>[] = [{ t: 0, v: 0 }];
  const title: StepKf<boolean>[] = [{ t: 0, v: true }];

  // Insert a "hold at current value" keyframe at time t so the next tween
  // starts from there instead of interpolating from the previous change.
  const hold = (kfs: ContKf[], t: number) => {
    const last = kfs[kfs.length - 1];
    if (last.t < t - 1e-6) kfs.push({ t, v: last.v });
  };
  const snapshot = (t: number) => {
    hold(camX, t);
    hold(camY, t);
    hold(camS, t);
    hold(path, t);
    hold(rvOp, t);
  };
  // Tween one channel from its current value to `v` over [start, end].
  const tween = (
    kfs: ContKf[],
    start: number,
    end: number,
    v: number,
    ease: EaseFn,
  ) => {
    hold(kfs, start);
    kfs[kfs.length - 1].ease = ease;
    kfs.push({ t: end, v });
  };

  let t = 0;

  // Scene 1 — intro title (3.2s)
  t += 3.2;
  snapshot(t);
  stage.push({ t, v: "reveal" });
  title.push({ t, v: false });

  // Scene 2 — reveal drift (1.6s, camera stays)
  t += 1.6;
  snapshot(t);
  stage.push({ t, v: "zoomHome" });

  // Scene 3 — zoom to home (2.2s)
  const home = WAYPOINTS[0];
  tween(camX, t, t + 2.2, home.x, easeCam);
  tween(camY, t, t + 2.2, home.y, easeCam);
  tween(camS, t, t + 2.2, 2.4, easeCam);
  t += 2.2;

  // Scene 4 — RV bounce in (fade 0.6s, then hold 0.8s)
  tween(rvOp, t, t + 0.6, 1, easeOut);
  t += 0.6;
  visible.push({ t, v: 0 });
  t += 0.8;

  // Scene 5 — drive each segment
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const toLen = segmentLens[i];
    const miles = WAYPOINTS[i].milesFromPrev;
    // Consistent 1.5-2s drive-to-zoom transitions per client spec.
    const driveDur = 1.8;
    const midX = (WAYPOINTS[i].x + WAYPOINTS[i - 1].x) / 2;
    const midY = (WAYPOINTS[i].y + WAYPOINTS[i - 1].y) / 2;

    snapshot(t);
    moving.push({ t, v: 1 });
    stage.push({ t, v: "driving" });
    tween(camX, t, t + driveDur, midX, easeCam);
    tween(camY, t, t + driveDur, midY, easeCam);
    tween(camS, t, t + driveDur, 2.1, easeCam);
    tween(path, t, t + driveDur, toLen, easeDrive);
    t += driveDur;
    moving.push({ t, v: 0 });

    // Arrive: 1.6s cinematic zoom, settle, then reveal label + icon.
    snapshot(t);
    stage.push({ t, v: "arrived" });
    tween(camX, t, t + 1.6, WAYPOINTS[i].x, easeCam);
    tween(camY, t, t + 1.6, WAYPOINTS[i].y, easeCam);
    tween(camS, t, t + 1.6, 2.8, easeCam);
    t += 1.6;
    // Camera settles for a beat before the label + icon appear.
    t += 0.35;
    visible.push({ t, v: i });
    t += 1.9;
  }

  // Scene 6 — outro overview (2.6s + 2.2s hold)
  snapshot(t);
  stage.push({ t, v: "outro" });
  tween(camX, t, t + 2.6, MAP_CX, easeCam);
  tween(camY, t, t + 2.6, MAP_CY, easeCam);
  tween(camS, t, t + 2.6, BASE_SCALE, easeCam);
  t += 2.6;
  t += 2.6;
  stage.push({ t, v: "done" });
  // Final fade-out beat.
  t += 0.8;

  return { duration: t, camX, camY, camS, path, rvOp, stage, visible, moving, title };
}

export function RoadTripAnimation({
  onComplete,
  autoPlay = true,
  showControls = true,
  chromeless = false,
}: {
  onComplete?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
  /** Hide brand chip + mileage HUD (used for clean MP4 exports). */
  chromeless?: boolean;
} = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  const [segmentLens, setSegmentLens] = useState<number[]>([]);
  const totalLen = segmentLens.at(-1) ?? 0;

  // Live motion values driven from the deterministic timeline.
  const pathLen = useMotionValue(0);
  const camX = useMotionValue(MAP_CX);
  const camY = useMotionValue(MAP_CY);
  const camScale = useMotionValue(BASE_SCALE);
  const rvOpacity = useMotionValue(0);
  const rvMoving = useMotionValue(0);
  const dashOffset = useMotionValue(1);

  const [stage, setStage] = useState<Stage>("intro");
  const [visibleIndex, setVisibleIndex] = useState<number>(-1);
  const [titleVisible, setTitleVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFps, setShowFps] = useState(false);

  // Playhead + RV transform live in motion values so the per-frame loop never
  // triggers a React re-render (critical for smoothness on mobile).
  const timeMV = useMotionValue(0);
  const rvX = useMotionValue(WAYPOINTS[0].x);
  const rvY = useMotionValue(WAYPOINTS[0].y);
  const rvAngle = useMotionValue(0);
  const [rvSpinning, setRvSpinning] = useState(false);

  // ── measure the path once mounted ──────────────────────────────────────────
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const full = path.getTotalLength();
    const samples = 2000;
    const pts: { x: number; y: number; d: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const d = (i / samples) * full;
      const p = path.getPointAtLength(d);
      pts.push({ x: p.x, y: p.y, d });
    }
    const lens: number[] = [0];
    let startFrom = 0;
    for (let w = 1; w < WAYPOINTS.length; w++) {
      const target = WAYPOINTS[w];
      let bestI = startFrom;
      let bestDist = Infinity;
      for (let i = startFrom; i < pts.length; i++) {
        const dx = pts[i].x - target.x;
        const dy = pts[i].y - target.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
        }
      }
      lens.push(pts[bestI].d);
      startFrom = bestI;
    }
    setSegmentLens(lens);
  }, []);

  useMotionValueEvent(pathLen, "change", (v) => {
    const path = pathRef.current;
    if (!path) return;
    // Keep the RV's nose (x=16) at the tip of the path, so its center is 15px behind
    const centerDist = Math.max(0, v - 15);
    const p = path.getPointAtLength(centerDist);
    const ahead = path.getPointAtLength(Math.min(centerDist + 1, totalLen || 1));
    rvX.set(p.x);
    rvY.set(p.y);
    rvAngle.set((Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI);
  });

  // Wheel spin is a boolean, so only flip React state when it actually changes.
  useMotionValueEvent(rvMoving, "change", (v) => {
    const next = v > 0.1;
    setRvSpinning((prev) => (prev === next ? prev : next));
  });

  // Human-readable scene label for the perf HUD.
  const sceneLabel = useMemo(() => {
    const dest = WAYPOINTS[visibleIndex]?.name;
    switch (stage) {
      case "intro":
        return "Intro";
      case "reveal":
        return "Map reveal";
      case "zoomHome":
        return "Zoom to start";
      case "driving": {
        const next = WAYPOINTS[visibleIndex + 1]?.name;
        return next ? `Driving → ${next}` : "Driving";
      }
      case "arrived":
        return dest ? `Arrived · ${dest}` : "Arrived";
      case "outro":
        return "Outro";
      case "done":
        return "Complete";
      default:
        return stage;
    }
  }, [stage, visibleIndex]);

  // Build a deterministic, scrub-friendly timeline.
  const timeline = useMemo<Timeline | null>(
    () => (segmentLens.length ? buildTimeline(segmentLens) : null),
    [segmentLens],
  );
  const duration = timeline?.duration ?? 0;

  const timeRef = useRef(0);
  const completedRef = useRef(false);

  const applyAt = useCallback(
    (t: number) => {
      if (!timeline) return;
      camX.set(sampleCont(timeline.camX, t));
      camY.set(sampleCont(timeline.camY, t));
      camScale.set(sampleCont(timeline.camS, t));
      const pl = sampleCont(timeline.path, t);
      pathLen.set(pl);
      dashOffset.set(Math.max(totalLen - pl, 0));
      rvOpacity.set(sampleCont(timeline.rvOp, t));
      rvMoving.set(sampleStep(timeline.moving, t));
      const nextStage = sampleStep(timeline.stage, t);
      setStage((prev) => (prev === nextStage ? prev : nextStage));
      const nvi = sampleStep(timeline.visible, t);
      setVisibleIndex((prev) => (prev === nvi ? prev : nvi));
      const tv = sampleStep(timeline.title, t);
      setTitleVisible((prev) => (prev === tv ? prev : tv));
    },
    [timeline, totalLen, camX, camY, camScale, pathLen, dashOffset, rvOpacity, rvMoving],
  );

  // Initial snap once timeline is available.
  useEffect(() => {
    if (timeline) applyAt(timeRef.current);
  }, [timeline, applyAt]);

  // Autoplay when timeline first becomes ready.
  useEffect(() => {
    if (timeline && autoPlay && !completedRef.current) setIsPlaying(true);
  }, [timeline, autoPlay]);

  // Playback loop.
  useEffect(() => {
    if (!timeline || !isPlaying) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      let next = timeRef.current + dt;
      if (next >= duration) {
        next = duration;
        timeRef.current = next;
        applyAt(next);
        timeMV.set(next);
        setIsPlaying(false);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
        return;
      }
      timeRef.current = next;
      applyAt(next);
      timeMV.set(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, timeline, duration, applyAt, onComplete, timeMV]);

  const handleTogglePlay = useCallback(() => {
    if (!timeline) return;
    if (timeRef.current >= duration - 0.001) {
      timeRef.current = 0;
      timeMV.set(0);
      applyAt(0);
      completedRef.current = false;
    }
    setIsPlaying((p) => !p);
  }, [timeline, duration, applyAt, timeMV]);

  const handleScrub = useCallback(
    (v: number) => {
      if (!timeline) return;
      setIsPlaying(false);
      const clamped = Math.max(0, Math.min(duration, v));
      timeRef.current = clamped;
      timeMV.set(clamped);
      applyAt(clamped);
      completedRef.current = clamped >= duration - 0.001;
    },
    [timeline, duration, applyAt, timeMV],
  );

  const handleRestart = useCallback(() => {
    if (!timeline) return;
    timeRef.current = 0;
    timeMV.set(0);
    applyAt(0);
    completedRef.current = false;
    setIsPlaying(true);
  }, [timeline, applyAt, timeMV]);

  // Camera transform string
  const cameraTransform = useTransform([camX, camY, camScale], (vals) => {
    const [x, y, s] = vals as number[];
    const tx = VIEW_W / 2 - x * s;
    const ty = VIEW_H / 2 - y * s;
    return `translate(${tx} ${ty}) scale(${s})`;
  });

  // Static decorative layer — built once so per-frame updates never touch it.
  const cloudLayer = useMemo(
    () =>
      [
        { x: 120, y: 90, s: 1, delay: 0 },
        { x: 760, y: 60, s: 1.4, delay: 4 },
        { x: 420, y: 40, s: 0.8, delay: 8 },
        { x: 640, y: 520, s: 1.1, delay: 2 },
        { x: 220, y: 540, s: 0.9, delay: 6 },
      ].map((c, i) => (
        <motion.g
          key={i}
          initial={{ x: c.x, opacity: 0 }}
          animate={{ x: [c.x - 40, c.x + 40, c.x - 40], opacity: 0.55 }}
          transition={{
            x: { duration: 18 + i * 3, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 2, delay: c.delay * 0.1 },
          }}
        >
          <Cloud x={0} y={c.y} scale={c.s} />
        </motion.g>
      )),
    [],
  );

  const mapLayer = useMemo(() => <UsaMap />, []);


  return (
    <div className="relative isolate h-full w-full overflow-hidden bg-background">
      {/* Ambient gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% -10%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%), radial-gradient(900px 600px at 90% 110%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%)",
        }}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="relative z-0 h-full w-full"
      >
        {/* Drifting clouds live outside the camera transform */}
        <g>
          {cloudLayer}
        </g>
        {/* Camera group */}
        <motion.g style={{ transform: cameraTransform }}>
          {mapLayer}

          {/* Route — soft glow underlay + main stroke */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="var(--route-glow)"
            strokeWidth={11}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: totalLen || 1,
              strokeDashoffset: totalLen || 1,
              opacity: 0.55,
            }}
          />
          <motion.path
            ref={pathRef}
            d={ROUTE_PATH}
            fill="none"
            stroke="#ffffff"
            strokeWidth={7.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: totalLen || 1,
              strokeDashoffset: dashOffset,
              opacity: 0.85,
            }}
          />
          <motion.path
            d={ROUTE_PATH}
            fill="none"
            stroke="var(--route)"
            strokeWidth={5.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: totalLen || 1,
              strokeDashoffset: dashOffset,
            }}
          />

          {/* RV sprite — above the route, below destination labels/icons so it never
              covers the first words of location names or the icon badges. */}
          <motion.g data-map-rv style={{ opacity: rvOpacity }}>
            <motion.g style={{ x: rvX, y: rvY, rotate: rvAngle }}>
              <RV spinning={rvSpinning} />
            </motion.g>
          </motion.g>

          {/* Waypoint pins — rendered after the RV so labels/icons stay on top.
              Full detail only for the current stop; earlier stops collapse to
              compact markers so labels never overlap. */}
          {WAYPOINTS.map((w, i) => {
            // Find all indices of WAYPOINTS that share this exact location and are currently reached
            const activeForLocation = WAYPOINTS.map((wp, idx) => 
              wp.x === w.x && wp.y === w.y && idx <= visibleIndex && stage !== "outro" && stage !== "done" ? idx : -1
            ).filter(idx => idx !== -1);
            
            if (activeForLocation.length === 0) return null;
            
            // Only render ONE pin per location, using the most recently reached state
            const highestIndex = Math.max(...activeForLocation);
            if (i !== highestIndex) return null;

            const isActive = highestIndex === visibleIndex && stage !== "outro" && stage !== "done";
            return (
              <Pin
                key={`${w.id}-${i}`}
                waypoint={w}
                visible
                compact={!isActive}
              />
            );
          })}

          {/* Compact pins for outro summary */}
          {(stage === "outro" || stage === "done") &&
            WAYPOINTS.filter((w, index, self) => 
              index === self.findIndex((t) => t.x === w.x && t.y === w.y)
            ).map((w, i) => {
              // Development check to ensure one element per destination
              if (process.env.NODE_ENV === "development") {
                 console.log(`[Summary] Rendering 1 icon for destination: ${w.name}`);
              }
              return (
                <g key={`sum-${w.id}-${i}`} style={{ transform: `translate(${w.x}px, ${w.y}px)` }}>
                  <circle r={9} fill="#fff" stroke="var(--pin)" strokeWidth={1.5} />
                  <g
                    style={{
                      transform: "translate(-6px, -6px)",
                      color: "var(--deep)",
                    }}
                  >
                    <DestinationIcon icon={w.icon} size={12} />
                  </g>
                </g>
              );
            })}
        </motion.g>
      </svg>

      {/* HUD overlays */}
      <AnimatePresence>
        {titleVisible && stage === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 pb-14 pt-12 sm:p-0"
          >
            <div className="w-full max-w-full text-center">
              <motion.p
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="hidden text-[9px] font-semibold uppercase tracking-[0.35em] text-primary sm:block sm:text-xs sm:tracking-[0.5em]"
              >
                A Cinematic Journey
              </motion.p>
              <motion.h1
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.9 }}
                className="mt-2 leading-[0.9] tracking-tight text-balance text-[color:var(--deep)] sm:mt-4"
                style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
              >
                <span className="block text-xl sm:text-7xl md:text-[7.5rem]">
                  Summer Road Trip
                </span>
                <span
                  className="mt-0.5 block text-lg italic text-primary sm:mt-2 sm:text-6xl md:text-8xl"
                >
                  2026
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="mt-2 hidden text-[8px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:mt-6 sm:block sm:text-sm sm:tracking-[0.4em]"
              >
                {WAYPOINTS.length - 1} Stops · {TOTAL_MILES.toLocaleString()} Miles · One RV
              </motion.p>
            </div>

          </motion.div>
        )}

        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 pb-14 pt-12 sm:p-0"
          >
            <div className="w-full max-w-full text-center">
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, letterSpacing: "0.35em" }}
                transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
                className="hidden text-[9px] font-semibold uppercase text-primary sm:block sm:text-xs"
              >
                Journey Complete
              </motion.p>
              <motion.h2
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
                className="mt-2 leading-[0.9] tracking-tight text-balance text-[color:var(--deep)] sm:mt-4"
                style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
              >
                <span className="block text-xl sm:text-7xl md:text-[6.5rem]">
                  Summer Road Trip
                </span>
                <span className="mt-0.5 block text-lg italic text-primary sm:mt-2 sm:text-6xl md:text-7xl">
                  2026
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.9 }}
                className="mt-2 hidden text-[8px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:mt-6 sm:block sm:text-sm sm:tracking-[0.4em]"
              >
                {TOTAL_MILES.toLocaleString()} Miles · {WAYPOINTS.length - 1} Stops
              </motion.p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-left brand chip */}
      {!chromeless && (
        <div
          className="pointer-events-none absolute left-3 top-3 flex max-w-[45%] items-center gap-1.5 truncate text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:left-6 sm:top-6 sm:max-w-none sm:gap-2 sm:text-[10px] sm:tracking-[0.35em]"
          style={{ zIndex: 30 }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate">Summer Road Trip · 2026</span>
        </div>
      )}


      {/* Fixed UI layer — completely separate from the map/camera layer.
          Never scales, pans, or reflows with the map. */}
      {!chromeless && stage !== "intro" && (
        <div
          data-mileage-layer="fixed-ui"
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 100 }}
        >
          <ProgressReadout
            segmentLens={segmentLens}
            pathLen={pathLen}
            stage={stage}
          />
        </div>
      )}


      {!chromeless && (
        <FpsMeter
          active={showFps}
          scene={sceneLabel}
          speed={isPlaying ? 1 : 0}
        />
      )}

      {/* Playback controls */}
      {showControls && timeline && (
        <PlaybackControls
          time={timeMV}
          duration={duration}
          isPlaying={isPlaying}
          onToggle={handleTogglePlay}
          onScrub={handleScrub}
          onRestart={handleRestart}
          showFps={showFps}
          onToggleFps={() => setShowFps((v) => !v)}
        />
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const PlaybackControls = memo(function PlaybackControls({
  time,
  duration,
  isPlaying,
  onToggle,
  onScrub,
  onRestart,
  showFps,
  onToggleFps,
}: {
  time: ReturnType<typeof useMotionValue<number>>;
  duration: number;
  isPlaying: boolean;
  onToggle: () => void;
  onScrub: (v: number) => void;
  onRestart: () => void;
  showFps: boolean;
  onToggleFps: () => void;
}) {
  // Re-render the scrubber at most ~10x/second (0.1s steps) instead of every
  // animation frame; the playhead itself stays in the motion value.
  const [displayTime, setDisplayTime] = useState(() => time.get());
  useMotionValueEvent(time, "change", (v) => {
    const q = Math.round(v * 10) / 10;
    setDisplayTime((prev) => (prev === q ? prev : q));
  });

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 flex w-[min(560px,calc(100%-1.5rem))] -translate-x-1/2 items-center gap-2 rounded-full border border-border/60 bg-white/90 px-3 py-1.5 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur sm:bottom-6 sm:w-[min(560px,calc(100%-3rem))] sm:gap-3 sm:px-4 sm:py-2">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--deep)] text-white transition hover:opacity-90 sm:h-8 sm:w-8"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="translate-x-[1px]" />}
      </button>
      <button
        type="button"
        onClick={onRestart}
        aria-label="Restart"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-[color:var(--deep)] transition hover:bg-slate-100 sm:h-8 sm:w-8"
      >
        <RotateCcw size={13} />
      </button>
      <span className="hidden w-10 shrink-0 text-right text-[10px] font-semibold tabular-nums tracking-wider text-[color:var(--deep)] sm:block">
        {formatTime(displayTime)}
      </span>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.05}
        value={Math.min(displayTime, duration)}
        onChange={(e) => onScrub(parseFloat(e.target.value))}
        aria-label="Scrub timeline"
        className="h-1 w-full min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[color:var(--primary)]"
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
            duration > 0 ? (displayTime / duration) * 100 : 0
          }%, rgb(226,232,240) ${
            duration > 0 ? (displayTime / duration) * 100 : 0
          }%, rgb(226,232,240) 100%)`,
        }}
      />
      <span className="w-9 shrink-0 text-[9px] font-semibold tabular-nums tracking-wider text-muted-foreground sm:w-10 sm:text-[10px]">
        <span className="sm:hidden">{formatTime(displayTime)}</span>
        <span className="hidden sm:inline">{formatTime(duration)}</span>
      </span>
      <button
        type="button"
        onClick={onToggleFps}
        aria-label="Toggle FPS meter"
        aria-pressed={showFps}
        title="Toggle FPS meter"
        className={`flex h-7 shrink-0 items-center justify-center rounded-full border px-2 font-mono text-[9px] font-semibold uppercase tracking-wider transition sm:h-8 sm:text-[10px] ${
          showFps
            ? "border-transparent bg-[color:var(--deep)] text-white"
            : "border-border text-muted-foreground hover:bg-slate-100"
        }`}
      >
        FPS
      </button>

    </div>


  );
});

function ProgressReadout({
  segmentLens,
  pathLen,
  stage,
}: {
  segmentLens: number[];
  pathLen: ReturnType<typeof useMotionValue<number>>;
  stage: Stage;
}) {
  const [miles, setMiles] = useState(0);
  const totalLen = segmentLens.at(-1) ?? 0;
  useMotionValueEvent(pathLen, "change", (v) => {
    if (!totalLen) return;
    const ratio = v / totalLen;
    setMiles(Math.round(ratio * TOTAL_MILES));
  });

  const complete = stage === "done";
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div
      data-mileage-box="true"
      // Pinned to one fixed screen position for the entire animation
      // (12px inset on mobile, 24px from sm up). Fixed width + height per
      // breakpoint so the text inside can never push into other elements.
      className="absolute right-3 top-3 h-[46px] w-[142px] sm:right-6 sm:top-6 sm:h-[80px] sm:w-[268px]"
      style={{ zIndex: 100 }}
    >
      <div
        className="flex h-full w-full flex-col items-end justify-center gap-0.5 overflow-hidden rounded-xl border border-border px-3 text-right shadow-[0_16px_38px_-16px_rgba(15,23,42,0.45)] sm:gap-1 sm:rounded-2xl sm:px-5"
        style={{ background: "#ffffff" }}
      >
        <p className="text-[7px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-[9px] sm:tracking-[0.4em]">
          {complete ? "Total Distance" : "Mileage"}
        </p>
        <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] tabular-nums text-[color:var(--deep)] sm:text-sm sm:tracking-[0.18em]">
          {complete
            ? `${fmt(TOTAL_MILES)} Miles`
            : `${fmt(miles)} of ${fmt(TOTAL_MILES)} Miles`}
        </p>
      </div>
    </div>
  );
}



function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }} opacity={0.7}>
      <ellipse cx={0} cy={0} rx={26} ry={10} fill="var(--cloud)" />
      <ellipse cx={-14} cy={4} rx={14} ry={7} fill="var(--cloud)" />
      <ellipse cx={16} cy={4} rx={16} ry={7} fill="var(--cloud)" />
    </g>
  );
}