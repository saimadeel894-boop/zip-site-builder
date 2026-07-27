import { memo, useMemo, useState } from "react";
import type { PerfSample } from "./perf-types";

type SceneRow = {
  scene: string;
  samples: number;
  avgFps: number;
  minFps: number;
  worstMs: number;
  seconds: number;
};

function rate(avgFps: number, worstMs: number) {
  if (avgFps >= 55 && worstMs <= 24) return { label: "Smooth", tone: "text-emerald-500" };
  if (avgFps >= 45 && worstMs <= 40) return { label: "Acceptable", tone: "text-amber-500" };
  return { label: "Janky", tone: "text-red-500" };
}

/**
 * Verdict + per-scene breakdown + worst moments for a recorded session.
 */
export const PerfSummary = memo(function PerfSummary({
  samples,
}: {
  samples: PerfSample[];
}) {
  const [tab, setTab] = useState<"scenes" | "worst">("scenes");

  const data = useMemo(() => {
    if (samples.length < 2) return null;
    const span = Math.max(1, samples[samples.length - 1].t - samples[0].t);
    const avgFps = samples.reduce((a, s) => a + s.fps, 0) / samples.length;
    const worstMs = Math.max(...samples.map((s) => s.worstMs));
    const below = samples.filter((s) => s.fps < 50).length;
    // frames that overran a 16.7ms budget, estimated per sample window
    const dropped = samples.reduce(
      (a, s) => a + Math.max(0, Math.round((s.worstMs - 16.7) / 16.7)),
      0,
    );

    const map = new Map<string, PerfSample[]>();
    for (const s of samples) {
      const key = s.scene || "—";
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    const perSample = span / samples.length;
    const scenes: SceneRow[] = [...map.entries()].map(([scene, list]) => ({
      scene,
      samples: list.length,
      avgFps: list.reduce((a, s) => a + s.fps, 0) / list.length,
      minFps: Math.min(...list.map((s) => s.fps)),
      worstMs: Math.max(...list.map((s) => s.worstMs)),
      seconds: (list.length * perSample) / 1000,
    }));

    const worstScenes = [...scenes].sort((a, b) => a.avgFps - b.avgFps).slice(0, 3);
    const spikes = [...samples]
      .sort((a, b) => b.worstMs - a.worstMs)
      .slice(0, 5);

    return {
      avgFps,
      worstMs,
      pctBelow: (below / samples.length) * 100,
      dropped,
      scenes,
      worstScenes,
      spikes,
      verdict: rate(avgFps, worstMs),
    };
  }, [samples]);

  if (!data) return null;

  return (
    <div className="mt-2 border-t border-border/60 pt-2">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`font-semibold uppercase tracking-wider ${data.verdict.tone}`}>
          {data.verdict.label}
        </span>
        <span className="text-muted-foreground">
          avg <span className="text-foreground">{data.avgFps.toFixed(0)} fps</span>
        </span>
        <span className="text-muted-foreground">
          worst <span className="text-foreground">{data.worstMs.toFixed(0)} ms</span>
        </span>
        <span className="text-muted-foreground">
          <span className="text-foreground">{data.pctBelow.toFixed(0)}%</span> under 50
        </span>
        <span className="text-muted-foreground">
          ~<span className="text-foreground">{data.dropped}</span> dropped
        </span>
        {data.worstScenes[0] && (
          <span className="truncate text-muted-foreground">
            weakest scene:{" "}
            <span className="text-foreground">{data.worstScenes[0].scene}</span>
          </span>
        )}
      </div>

      <div className="mb-1 flex items-center gap-1">
        {(["scenes", "worst"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-2 py-[2px] uppercase tracking-wider transition ${
              tab === k
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {k === "scenes" ? "By scene" : "Worst moments"}
          </button>
        ))}
      </div>

      <div className="max-h-[124px] overflow-y-auto pr-1">
        {tab === "scenes" ? (
          <table className="w-full border-collapse text-left">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-[2px] font-normal">Scene</th>
                <th className="py-[2px] text-right font-normal">Dur</th>
                <th className="py-[2px] text-right font-normal">Avg</th>
                <th className="py-[2px] text-right font-normal">Min</th>
                <th className="py-[2px] text-right font-normal">Worst</th>
              </tr>
            </thead>
            <tbody>
              {data.scenes.map((r) => (
                <tr key={r.scene} className="border-t border-border/40">
                  <td className="max-w-[180px] truncate py-[2px] pr-2">{r.scene}</td>
                  <td className="py-[2px] text-right text-muted-foreground">
                    {r.seconds.toFixed(1)}s
                  </td>
                  <td
                    className={`py-[2px] text-right ${
                      r.avgFps >= 55
                        ? "text-emerald-500"
                        : r.avgFps >= 45
                          ? "text-amber-500"
                          : "text-red-500"
                    }`}
                  >
                    {r.avgFps.toFixed(0)}
                  </td>
                  <td className="py-[2px] text-right text-muted-foreground">
                    {r.minFps}
                  </td>
                  <td className="py-[2px] text-right text-amber-600">
                    {r.worstMs.toFixed(0)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="space-y-[2px]">
            {data.spikes.map((s, i) => (
              <li
                key={`${s.t}-${i}`}
                className="flex items-center justify-between gap-2 border-t border-border/40 py-[2px]"
              >
                <span className="truncate">
                  <span className="text-muted-foreground">
                    {(s.t / 1000).toFixed(1)}s
                  </span>{" "}
                  {s.scene || "—"}
                  {s.transition === 1 && (
                    <span className="ml-1 text-primary">· transition</span>
                  )}
                </span>
                <span className="shrink-0">
                  <span className="text-amber-600">{s.worstMs.toFixed(0)}ms</span>{" "}
                  <span className="text-muted-foreground">/ {s.fps} fps</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
