import { createFileRoute } from "@tanstack/react-router";

import { RoadTripAnimation } from "@/components/trip/RoadTripAnimation";
import { ExportPanel } from "@/components/trip/ExportPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Route Weaver — Animated US Road Trip Maps" },
      {
        name: "description",
        content:
          "Watch an RV trace your cross-country route across an animated US map, then export the trip as a shareable clip.",
      },
      { property: "og:title", content: "Route Weaver — Animated US Road Trip Maps" },
      {
        property: "og:description",
        content: "Animate and export your cross-country road trip route on a stylized US map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});


function Index() {
  return (
    <main className="min-h-screen w-full bg-background">
      {/* 16:9 stage — fills the viewport while preserving cinematic ratio. */}
      <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center p-2 sm:p-8">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] sm:rounded-3xl">
          <RoadTripAnimation />
          <ExportPanel />
        </div>
      </div>
    </main>

  );
}
