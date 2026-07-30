import type { IconKey } from "@/lib/trip-data";

type Props = { icon: IconKey; size?: number };

const PATHS: Record<IconKey, string[]> = {
  home: [
    "M3.5 11.2 12 4.5l8.5 6.7",
    "M5.5 10v9.5h13V10",
    "M10 19.5V14h4v5.5",
    "M16 6.5V4.5h2v3.7",
  ],
  boat: [
    "M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z",
    "M21 14 10 2 3 14h18Z",
    "M10 2v16"
  ],
  cave: [
    "M3 20.5c0-8.5 4-13.5 9-13.5s9 5 9 13.5",
    "M9 20.5c0-4 1.4-7 3-7s3 3 3 7",
    "M11 4.5l1-1 1 1",
    "M12 3.5v3",
  ],
  raft: [
    "M7 13 8.8 6.5h6.4L17 13",
    "M9.5 10h5",
    "M3 15.5c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4",
    "M3 19c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4",
  ],
  guitar: [
    "M15.5 3.5 20.5 8.5l-2.5 2.5",
    "M18 6l-3 3",
    "M14.5 9.5l-1.7 1.7",
    "M13 11.2l-5.3 5.3a3.5 3.5 0 1 0 4.8 4.8l5.3-5.3-2.4-2.4-2.4-2.4z",
    "M12 16.4a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0z",
  ],
  bath: [
    "M3 12h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 14.5V12z",
    "M6 12V6.2a1.7 1.7 0 0 1 1.7-1.7h.6a1.7 1.7 0 0 1 1.7 1.7v.3",
    "M8.4 7.7l1.6-1.6 1.6 1.6",
    "M6 19.5l-1 2M18 19.5l1 2",
  ],
  arch: ["M4 20V12a8 8 0 0 1 16 0v8", "M7 20v-8a5 5 0 0 1 10 0v8", "M3.5 20.5h17"],
  beach: [
    "M12 3.2v18",
    "M12 6c-4.5 0-8.5 3-9.5 6.5H12",
    "M12 6c3.5 0 6 1.5 7.5 3.5",
    "M3 19.5c2-1 4-1 6 0s4 1 6 0 4-1 6 0",
  ],
};

/**
 * Static outlined destination icon drawn as plain SVG geometry (no nested
 * <svg>, no async asset loading), so it always renders inside the map's SVG
 * tree and can never fall back to an empty/loading circle.
 */
export function DestinationIcon({ icon, size = 22 }: Props) {
  const paths = PATHS[icon] ?? PATHS.home;
  const k = size / 24;

  return (
    <g
      aria-hidden
      transform={`scale(${k})`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}
