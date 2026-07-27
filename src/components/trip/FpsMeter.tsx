import { memo, useCallback, useEffect, useRef, useState } from "react";
import { BarChart2, Circle, Download, Square } from "lucide-react";
import { PerfChart } from "./PerfChart";
import type { PerfSample as Sample } from "./perf-types";

function toCsv(rows: Sample[]): string {
  const head = [
    "elapsed_s",
    "fps",
    "avg_frame_ms",
    "worst_frame_ms",
    "frames",
    "scene",
    "speed",
    "scene_transition",
  ].join(",");
  const body = rows.map((r) =>
    [
      (r.t / 1000).toFixed(3),
      r.fps,
      r.avgMs.toFixed(2),
      r.worstMs.toFixed(2),
      r.frames,
      `"${r.scene.replace(/"/g, '""')}"`,
      r.speed,
      r.transition,
    ].join(","),
  );
  return [head, ...body].join("\n");
}

/**
 * Lightweight FPS / frame-time HUD with an optional recording mode.
 * Runs its own rAF loop and only re-renders ~4x per second.
 * Tap the readout to collapse it down to a dot.
 */
export const FpsMeter = memo(function FpsMeter({
  active = true,
  scene,
  speed,
}: {
  active?: boolean;
  /** Current stage / destination label, e.g. "Driving → Moab". */
  scene?: string;
  /** Playback rate, or 0 when paused. */
  speed?: number;
}) {
  const [open, setOpen] = useState(true);
  const [stats, setStats] = useState({ fps: 0, avg: 0, worst: 0 });
  const [recording, setRecording] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartData, setChartData] = useState<Sample[]>([]);

  // Latest scene/speed without restarting the rAF loop.
  const metaRef = useRef({ scene: scene ?? "", speed: speed ?? 0 });
  metaRef.current = { scene: scene ?? "", speed: speed ?? 0 };

  const samplesRef = useRef<Sample[]>([]);
  const recordingRef = useRef(false);
  const startRef = useRef(0);
  const lastSceneRef = useRef("");

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let worst = 0;
    let sum = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      frames += 1;
      sum += dt;
      if (dt > worst) worst = dt;

      if (acc >= 250) {
        const fps = Math.round((frames * 1000) / acc);
        const avg = sum / frames;
        setStats({ fps, avg, worst });

        if (recordingRef.current) {
          const { scene: sc, speed: sp } = metaRef.current;
          const transition = sc !== lastSceneRef.current ? 1 : 0;
          lastSceneRef.current = sc;
          samplesRef.current.push({
            t: now - startRef.current,
            fps,
            avgMs: avg,
            worstMs: worst,
            frames,
            scene: sc,
            speed: sp,
            transition,
          });
          setSampleCount(samplesRef.current.length);
          setChartData([...samplesRef.current]);
        }

        acc = 0;
        frames = 0;
        sum = 0;
        worst = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const toggleRecording = useCallback(() => {
    setRecording((r) => {
      const next = !r;
      if (next) {
        samplesRef.current = [];
        setSampleCount(0);
        setChartData([]);
        startRef.current = performance.now();
        lastSceneRef.current = "";
      }
      recordingRef.current = next;
      return next;
    });
  }, []);

  const download = useCallback(() => {
    const rows = samplesRef.current;
    if (!rows.length) return;
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perf-log-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (!active) return null;

  const tone =
    stats.fps >= 50
      ? "text-emerald-500"
      : stats.fps >= 30
        ? "text-amber-500"
        : "text-destructive";

  return (
    <>
      {chartOpen && (
        <PerfChart samples={chartData} onClose={() => setChartOpen(false)} />
      )}
    <div
      className="pointer-events-auto absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 font-mono text-[10px] leading-none shadow-sm backdrop-blur sm:bottom-6 sm:left-6 sm:text-[11px]"
      style={{ zIndex: 110 }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle FPS readout"
        className="flex items-center gap-2"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            stats.fps >= 50
              ? "bg-emerald-500"
              : stats.fps >= 30
                ? "bg-amber-500"
                : "bg-destructive"
          }`}
        />
        {open && (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className={`font-semibold ${tone}`}>{stats.fps} fps</span>
            <span className="text-muted-foreground">
              {stats.avg.toFixed(1)} ms
            </span>
            <span className="hidden text-muted-foreground sm:inline">
              max {stats.worst.toFixed(0)} ms
            </span>
            {(scene || speed !== undefined) && (
              <span className="flex items-center gap-1.5 border-l border-border/70 pl-2 text-muted-foreground">
                {scene && (
                  <span className="max-w-[92px] truncate sm:max-w-[160px]">
                    {scene}
                  </span>
                )}
                {speed !== undefined && (
                  <span className="font-semibold text-foreground">
                    {speed === 0 ? "paused" : `${speed}x`}
                  </span>
                )}
              </span>
            )}
          </span>
        )}
      </button>

      {open && (
        <span className="flex items-center gap-1 border-l border-border/70 pl-2">
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={recording ? "Stop performance log" : "Record performance log"}
            title={recording ? "Stop recording" : "Record performance log"}
            className={`flex h-5 items-center gap-1 rounded-full px-1.5 transition ${
              recording
                ? "bg-destructive text-destructive-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {recording ? <Square size={9} fill="currentColor" /> : <Circle size={9} />}
            <span className="tabular-nums">{sampleCount}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setChartData([...samplesRef.current]);
              setChartOpen((c) => !c);
            }}
            disabled={!sampleCount}
            aria-label="Show performance chart"
            aria-pressed={chartOpen}
            title="Show performance chart"
            className={`flex h-5 w-5 items-center justify-center rounded-full transition disabled:opacity-30 ${
              chartOpen
                ? "bg-[color:var(--deep)] text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BarChart2 size={10} />
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!sampleCount}
            aria-label="Download performance CSV"
            title="Download CSV"
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          >
            <Download size={10} />
          </button>
        </span>
      )}
    </div>
    </>
  );
});
