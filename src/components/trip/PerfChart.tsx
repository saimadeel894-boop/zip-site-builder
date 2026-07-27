import { memo, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { PerfSample } from "./perf-types";
import { PerfSummary } from "./PerfSummary";

/**
 * Compact SVG chart of a recorded performance session.
 * Plots fps (line, left axis) and frame time (area, right axis) with
 * vertical markers at every scene transition.
 */
export const PerfChart = memo(function PerfChart({
  samples,
  onClose,
}: {
  samples: PerfSample[];
  onClose: () => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 520;
  const H = 150;
  const PAD_L = 26;
  const PAD_R = 30;
  const PAD_T = 10;
  const PAD_B = 18;

  const chart = useMemo(() => {
    if (samples.length < 2) return null;
    const t0 = samples[0].t;
    const t1 = samples[samples.length - 1].t || 1;
    const span = Math.max(1, t1 - t0);
    const maxFps = Math.max(60, ...samples.map((s) => s.fps));
    const maxMs = Math.max(33, ...samples.map((s) => s.worstMs));

    const x = (s: PerfSample) =>
      PAD_L + ((s.t - t0) / span) * (W - PAD_L - PAD_R);
    const yFps = (v: number) =>
      PAD_T + (1 - v / maxFps) * (H - PAD_T - PAD_B);
    const yMs = (v: number) => PAD_T + (1 - v / maxMs) * (H - PAD_T - PAD_B);

    const fpsLine = samples
      .map((s, i) => `${i ? "L" : "M"}${x(s).toFixed(1)},${yFps(s.fps).toFixed(1)}`)
      .join(" ");
    const msLine = samples
      .map((s, i) => `${i ? "L" : "M"}${x(s).toFixed(1)},${yMs(s.avgMs).toFixed(1)}`)
      .join(" ");
    const msArea = `${msLine} L${x(samples[samples.length - 1]).toFixed(1)},${H - PAD_B} L${x(samples[0]).toFixed(1)},${H - PAD_B} Z`;

    const transitions = samples
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => i > 0 && s.transition === 1);

    const avgFps =
      samples.reduce((a, s) => a + s.fps, 0) / samples.length;
    const worst = Math.max(...samples.map((s) => s.worstMs));
    const lowFrames = samples.filter((s) => s.fps < 50).length;

    return {
      x,
      yFps,
      maxFps,
      maxMs,
      fpsLine,
      msArea,
      transitions,
      avgFps,
      worst,
      lowFrames,
      duration: span / 1000,
    };
  }, [samples]);

  return (
    <div
      className="pointer-events-auto absolute bottom-14 left-3 w-[min(540px,calc(100%-1.5rem))] rounded-2xl border border-border/70 bg-background/95 p-3 font-mono text-[10px] shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)] backdrop-blur sm:bottom-20 sm:left-6"
      style={{ zIndex: 120 }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold uppercase tracking-wider">
            Session
          </span>
          {chart && (
            <>
              <span className="text-muted-foreground">
                {chart.duration.toFixed(1)}s · {samples.length} samples
              </span>
              <span className="text-emerald-500">
                avg {chart.avgFps.toFixed(0)} fps
              </span>
              <span className="text-amber-500">
                worst {chart.worst.toFixed(0)} ms
              </span>
              <span className="text-muted-foreground">
                {chart.lowFrames} below 50
              </span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close performance chart"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X size={11} />
        </button>
      </div>

      {!chart ? (
        <p className="py-6 text-center text-muted-foreground">
          Record at least a second of playback to see the chart.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="FPS and frame time over the recorded session"
            onMouseLeave={() => setHover(null)}
          >
            {/* gridlines */}
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={PAD_L}
                x2={W - PAD_R}
                y1={PAD_T + f * (H - PAD_T - PAD_B)}
                y2={PAD_T + f * (H - PAD_T - PAD_B)}
                stroke="currentColor"
                className="text-border"
                strokeWidth={0.5}
              />
            ))}
            {/* 60fps reference */}
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={chart.yFps(60)}
              y2={chart.yFps(60)}
              stroke="currentColor"
              className="text-emerald-500/50"
              strokeWidth={0.6}
              strokeDasharray="3 3"
            />

            {/* scene transitions */}
            {chart.transitions.map(({ s, i }) => (
              <g key={i}>
                <line
                  x1={chart.x(s)}
                  x2={chart.x(s)}
                  y1={PAD_T}
                  y2={H - PAD_B}
                  stroke="currentColor"
                  className="text-primary/45"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
              </g>
            ))}

            {/* frame time area */}
            <path
              d={chart.msArea}
              className="fill-amber-400/20 stroke-amber-500/70"
              strokeWidth={1}
            />
            {/* fps line */}
            <path
              d={chart.fpsLine}
              fill="none"
              className="stroke-emerald-500"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />

            {/* hover hit areas */}
            {samples.map((s, i) => (
              <rect
                key={i}
                x={chart.x(s) - 3}
                y={PAD_T}
                width={6}
                height={H - PAD_T - PAD_B}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
            {hover !== null && samples[hover] && (
              <line
                x1={chart.x(samples[hover])}
                x2={chart.x(samples[hover])}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="currentColor"
                className="text-foreground/50"
                strokeWidth={0.8}
              />
            )}

            {/* axis labels */}
            <text x={2} y={PAD_T + 6} className="fill-emerald-600" fontSize={7}>
              {chart.maxFps.toFixed(0)}
            </text>
            <text x={2} y={H - PAD_B} className="fill-emerald-600" fontSize={7}>
              0
            </text>
            <text
              x={W - PAD_R + 4}
              y={PAD_T + 6}
              className="fill-amber-600"
              fontSize={7}
            >
              {chart.maxMs.toFixed(0)}ms
            </text>
            <text
              x={W - PAD_R + 4}
              y={H - PAD_B}
              className="fill-amber-600"
              fontSize={7}
            >
              0
            </text>
          </svg>

          <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="h-[2px] w-3 bg-emerald-500" /> fps
              </span>
              <span className="flex items-center gap-1">
                <span className="h-[2px] w-3 bg-amber-500" /> frame ms
              </span>
              <span className="flex items-center gap-1">
                <span className="h-[9px] w-[1px] bg-primary/60" /> scene change
              </span>
            </span>
            <span className="truncate text-right">
              {hover !== null && samples[hover]
                ? `${(samples[hover].t / 1000).toFixed(1)}s · ${samples[hover].fps} fps · ${samples[hover].avgMs.toFixed(1)} ms · ${samples[hover].scene || "—"}`
                : "hover the chart for details"}
            </span>
          </div>
        </>
      )}
    </div>
  );
});
