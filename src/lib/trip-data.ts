import { CITY_POINTS } from "./us-map-generated";

export type IconKey =
  | "home"
  | "boat"
  | "cave"
  | "raft"
  | "guitar"
  | "bath"
  | "arch"
  | "beach";

export type Waypoint = {
  id: string;
  name: string;
  region?: string;
  /** Projected Albers-USA coordinates (viewBox 0 0 975 610). */
  x: number;
  y: number;
  icon: IconKey;
  /** Miles from previous stop. `0` for the origin. */
  milesFromPrev: number;
  /** Preferred label anchor relative to the pin. */
  labelSide: "left" | "right" | "top" | "bottom";
};

const ICONS: Record<string, IconKey> = {
  home: "home",
  "lake-cumberland": "boat",
  "mammoth-cave": "cave",
  "new-river": "raft",
  nashville: "guitar",
  "hot-springs": "bath",
  "st-louis": "arch",
  "indiana-dunes": "beach",
  "home-return": "home",
};

const MILES: Record<string, number> = {
  home: 0,
  "lake-cumberland": 230,
  "mammoth-cave": 78,
  "new-river": 400,
  nashville: 450,
  "hot-springs": 410,
  "st-louis": 410,
  "indiana-dunes": 310,
  "home-return": 300,
};

const LABEL_SIDE: Record<string, Waypoint["labelSide"]> = {
  home: "right",
  "lake-cumberland": "right",
  "mammoth-cave": "left",
  "new-river": "right",
  nashville: "left",
  "hot-springs": "left",
  "st-louis": "left",
  "indiana-dunes": "top",
  "home-return": "right",
};

export const WAYPOINTS: Waypoint[] = CITY_POINTS.map((c) => ({
  id: c.id,
  name: c.name,
  region: c.region,
  x: c.x,
  y: c.y,
  icon: ICONS[c.id],
  milesFromPrev: MILES[c.id],
  labelSide: LABEL_SIDE[c.id],
}));

/** Build a smooth SVG path through waypoints using a Catmull-Rom → Bezier conversion. */
export function buildRoutePath(points: { x: number; y: number }[], tension = 0.5): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  const p = points;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export const ROUTE_PATH = buildRoutePath(WAYPOINTS);

/** Total miles across the trip. */
export const TOTAL_MILES = WAYPOINTS.reduce((s, w) => s + w.milesFromPrev, 0);