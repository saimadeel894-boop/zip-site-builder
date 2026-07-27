import { createFileRoute } from "@tanstack/react-router";
import { RoadTripAnimation } from "@/components/trip/RoadTripAnimation";

export const Route = createFileRoute("/render")({
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