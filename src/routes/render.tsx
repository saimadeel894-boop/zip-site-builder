import { createFileRoute } from "@tanstack/react-router";
import { RoadTripAnimation } from "@/components/trip/RoadTripAnimation";

export const Route = createFileRoute("/render")({
  head: () => ({
    meta: [
      { title: "Render View — Route Weaver" },
      {
        name: "description",
        content: "Chromeless full-screen playback of the road trip animation, built for clean captures.",
      },
      { property: "og:title", content: "Render View — Route Weaver" },
      {
        property: "og:description",
        content: "Full-screen, controls-free playback of your animated road trip route.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RenderPage,
});


function RenderPage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <RoadTripAnimation chromeless autoPlay showControls={false} />
    </div>
  );
}