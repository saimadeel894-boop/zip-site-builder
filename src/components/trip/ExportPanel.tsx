import { useCallback, useEffect, useRef, useState } from "react";
import { toCanvas } from "html-to-image";

import { RoadTripAnimation } from "./RoadTripAnimation";

type AspectKey = "16:9" | "9:16";

const DIMENSIONS: Record<AspectKey, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

const CAPTURE_FPS = 30;
// Safety cap in case onComplete never fires.
const MAX_DURATION_MS = 90_000;

function pickMimeType(): { mimeType: string; extension: "mp4" | "webm" } {
  const candidates: Array<{ mimeType: string; extension: "mp4" | "webm" }> = [
    { mimeType: 'video/mp4;codecs="avc1.42E01E"', extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: 'video/webm;codecs="vp9"', extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

export function ExportPanel() {
  const [aspect, setAspect] = useState<AspectKey | null>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<boolean>(false);

  const handleExport = useCallback((key: AspectKey) => {
    doneRef.current = false;
    setStatus("Preparing…");
    setProgress(0);
    setAspect(key);
  }, []);

  useEffect(() => {
    if (!aspect) return;
    let cancelled = false;
    let recorder: MediaRecorder | null = null;
    let rafId = 0;
    const startedAt = performance.now();

    const run = async () => {
      // Wait a tick for the hidden stage to mount and lay out.
      await new Promise((r) => setTimeout(r, 120));
      const stage = stageRef.current;
      if (!stage || cancelled) return;

      const { w, h } = DIMENSIONS[aspect];
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const { mimeType, extension } = pickMimeType();
      const stream = canvas.captureStream(CAPTURE_FPS);
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<Blob>((resolve) => {
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      recorder.start(500);
      setStatus("Recording…");

      const frameInterval = 1000 / CAPTURE_FPS;
      let lastDraw = 0;
      const draw = async (t: number) => {
        if (cancelled) return;
        if (t - lastDraw >= frameInterval - 2) {
          lastDraw = t;
          try {
            const frameCanvas = await toCanvas(stage, {
              width: w,
              height: h,
              pixelRatio: 1,
              cacheBust: false,
              skipFonts: false,
              backgroundColor: "#ffffff",
            });
            ctx.drawImage(frameCanvas, 0, 0, w, h);
          } catch {
            /* skip a frame on transient errors */
          }
          const elapsed = performance.now() - startedAt;
          setProgress(Math.min(0.99, elapsed / MAX_DURATION_MS));
        }
        if (doneRef.current || performance.now() - startedAt > MAX_DURATION_MS) {
          // Give recorder one last flush.
          setStatus("Encoding…");
          setTimeout(() => recorder?.stop(), 400);
          return;
        }
        rafId = requestAnimationFrame((tt) => void draw(tt));
      };
      rafId = requestAnimationFrame((t) => void draw(t));

      const blob = await stopped;
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `summer-road-trip-2026-${aspect.replace(":", "x")}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setProgress(1);
      setStatus(`Saved ${a.download}`);
      setTimeout(() => {
        if (!cancelled) setAspect(null);
      }, 1200);
    };

    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, [aspect]);

  const dims = aspect ? DIMENSIONS[aspect] : null;

  return (
    <>
      <div className="pointer-events-auto absolute bottom-14 right-3 z-20 flex flex-row items-end gap-2 sm:bottom-6 sm:right-6 sm:flex-col">
        <button
          type="button"
          onClick={() => handleExport("16:9")}
          disabled={aspect !== null}
          className="rounded-full bg-[color:var(--deep)] px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.3em]"
        >
          Export 16:9
        </button>
        <button
          type="button"
          onClick={() => handleExport("9:16")}
          disabled={aspect !== null}
          className="rounded-full bg-primary px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.3em]"
        >
          Export 9:16
        </button>
      </div>


      {aspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[min(420px,90vw)] rounded-2xl bg-white p-6 text-center shadow-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-primary">
              Rendering {aspect}
            </p>
            <p className="mt-2 text-lg font-bold text-[color:var(--deep)]">{status}</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Please keep this tab focused. The full animation is being captured frame by frame at {DIMENSIONS[aspect].w}×{DIMENSIONS[aspect].h}.
            </p>
          </div>
        </div>
      )}

      {/* Hidden capture stage — mounted only during export */}
      {aspect && dims && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: dims.w,
            height: dims.h,
            pointerEvents: "none",
            zIndex: -1,
            opacity: 0,
            transform: "translate(-200vw, 0)",
          }}
        >
          <div
            ref={stageRef}
            style={{
              width: dims.w,
              height: dims.h,
              background: "#ffffff",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <RoadTripAnimation
              showControls={false}
              chromeless
              onComplete={() => {
                doneRef.current = true;
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}