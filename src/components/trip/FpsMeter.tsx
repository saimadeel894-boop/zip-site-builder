import { memo, useEffect, useRef, useState } from "react";

/**
 * Lightweight FPS / frame-time HUD.
 * Runs its own rAF loop and only re-renders ~4x per second.
 * Tap the badge to collapse it down to a dot.
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
  const fpsRef = useRef<HTMLSpanElement>(null);

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
        setStats({
          fps: Math.round((frames * 1000) / acc),
          avg: sum / frames,
          worst,
        });
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

  if (!active) return null;

  const tone =
    stats.fps >= 50
      ? "text-emerald-500"
      : stats.fps >= 30
        ? "text-amber-500"
        : "text-destructive";

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-label="Toggle FPS meter"
      className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 font-mono text-[10px] leading-none shadow-sm backdrop-blur sm:bottom-6 sm:left-6 sm:text-[11px]"
      style={{ zIndex: 110 }}
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
          <span ref={fpsRef} className={`font-semibold ${tone}`}>
            {stats.fps} fps
          </span>
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
  );
});
