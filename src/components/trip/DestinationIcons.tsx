import type { IconKey } from "@/lib/trip-data";

type Props = { icon: IconKey; size?: number };

/**
 * Premium outlined destination icons — hand-tuned SVG at a
 * consistent 24×24 grid with a thin 1.5 stroke and rounded caps.
 */
export function DestinationIcon({ icon, size = 22 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3.5 11.2 12 4.5l8.5 6.7" />
          <path d="M5.5 10v9.5h13V10" />
          <path d="M10 19.5V14h4v5.5" />
          <path d="M16 6.5V4.5h2v3.7" />
        </svg>
      );
    case "boat":
      return (
        <svg {...common}>
          <path d="M3 15.5l1.6 4.2a1 1 0 0 0 .93.62h13a1 1 0 0 0 .93-.62L21 15.5" />
          <path d="M4.4 15.5 6 11.5h12l1.6 4" />
          <path d="M12 3.5v8" />
          <path d="M12 3.5l6 3-6 2" />
          <path d="M12 20.3v1.5" />
        </svg>
      );
    case "cave":
      return (
        <svg {...common}>
          <path d="M3 20.5c0-8.5 4-13.5 9-13.5s9 5 9 13.5" />
          <path d="M9 20.5c0-4 1.4-7 3-7s3 3 3 7" />
          <path d="M11 4.5l1-1 1 1" />
          <path d="M12 3.5v3" />
        </svg>
      );
    case "raft":
      return (
        <svg {...common}>
          <path d="M7 13 8.8 6.5h6.4L17 13" />
          <path d="M9.5 10h5" />
          <path d="M3 15.5c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4" />
          <path d="M3 19c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4" />
        </svg>
      );
    case "guitar":
      return (
        <svg {...common}>
          <path d="M15.5 3.5 20.5 8.5l-2.5 2.5" />
          <path d="M18 6l-3 3" />
          <path d="M14.5 9.5l-1.7 1.7" />
          <path d="M13 11.2l-5.3 5.3a3.5 3.5 0 1 0 4.8 4.8l5.3-5.3-2.4-2.4-2.4-2.4z" />
          <circle cx={10.6} cy={16.4} r={1.4} />
        </svg>
      );
    case "bath":
      return (
        <svg {...common}>
          <path d="M3 12h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 14.5V12z" />
          <path d="M6 12V6.2a1.7 1.7 0 0 1 1.7-1.7h.6a1.7 1.7 0 0 1 1.7 1.7v.3" />
          <path d="M8.4 7.7l1.6-1.6 1.6 1.6" />
          <path d="M6 19.5l-1 2M18 19.5l1 2" />
        </svg>
      );
    case "arch":
      return (
        <svg {...common}>
          <path d="M4 20V12a8 8 0 0 1 16 0v8" />
          <path d="M7 20v-8a5 5 0 0 1 10 0v8" />
          <path d="M3.5 20.5h17" />
        </svg>
      );
    case "beach":
      return (
        <svg {...common}>
          <path d="M12 3.2v18" />
          <path d="M12 6c-4.5 0-8.5 3-9.5 6.5H12" />
          <path d="M12 6c3.5 0 6 1.5 7.5 3.5" />
          <path d="M3 19.5c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
        </svg>
      );
  }
}