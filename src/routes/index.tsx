import { createFileRoute } from "@tanstack/react-router";

import { RoadTripAnimation } from "@/components/trip/RoadTripAnimation";
import { ExportPanel } from "@/components/trip/ExportPanel";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen w-full bg-background">
      {/* 16:9 stage — fills the viewport while preserving cinematic ratio. */}
      <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center p-4 sm:p-8">
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
          <RoadTripAnimation />
          <ExportPanel />
        </div>
      </div>
    </main>
  );
}
