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

/**
 * Trip order, sequenced as a clean geographic loop so the drawn route never
 * doubles back on itself: Ohio → Indiana Dunes → St. Louis → Hot Springs →
 * Nashville → Mammoth Cave → Lake Cumberland → New River Gorge → Ohio.
 */
const TRIP_ORDER = [
  "home",
  "new-river",
  "lake-cumberland",
  "mammoth-cave",
  "nashville",
  "hot-springs",
  "st-louis",
  "indiana-dunes",
  "home-return",
] as const;

const MILES: Record<string, number> = {
  home: 0,
  "new-river": 450,
  "lake-cumberland": 368,
  "mammoth-cave": 110,
  nashville: 120,
  "hot-springs": 440,
  "st-louis": 460,
  "indiana-dunes": 310,
  "home-return": 330,
};

/** Label anchors chosen so no label ever sits over its own or a neighbour's icon. */
const LABEL_SIDE: Record<string, Waypoint["labelSide"]> = {
  home: "right",
  "indiana-dunes": "top",
  "st-louis": "left",
  "hot-springs": "left",
  nashville: "bottom",
  "mammoth-cave": "left",
  "lake-cumberland": "bottom",
  "new-river": "right",
  "home-return": "top",
};

const BY_ID = new Map(CITY_POINTS.map((c) => [c.id, c]));

export const WAYPOINTS: Waypoint[] = TRIP_ORDER.map((id) => {
  const c = BY_ID.get(id)!;
  return {
    id: c.id,
    name: c.name,
    region: c.region,
    x: c.x,
    y: c.y,
    icon: ICONS[c.id],
    milesFromPrev: MILES[c.id],
    labelSide: LABEL_SIDE[c.id],
  };
});

/**
 * Build the route as a smooth spline curve through all waypoints (Catmull-Rom to Cubic Bezier).
 * This forms a realistic curved road path rather than straight triangle geometry.
 */
export function buildRoutePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
    
    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const d23 = Math.hypot(p3.x - p2.x, p3.y - p2.y) || 1;
    
    // Scale tangents by the distance of the segment being drawn (d12).
    // This centripetal-like scaling prevents overshooting and loop-backs on tight corners.
    const t1 = 0.25 * Math.min(d12 / (d01 + d12), 0.5);
    const t2 = 0.25 * Math.min(d12 / (d12 + d23), 0.5);
    
    const cp1x = p1.x + (p2.x - p0.x) * t1;
    const cp1y = p1.y + (p2.y - p0.y) * t1;
    const cp2x = p2.x - (p3.x - p1.x) * t2;
    const cp2y = p2.y - (p3.y - p1.y) * t2;
    
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export const ROUTE_PATH = buildRoutePath(WAYPOINTS);

/** Total miles across the trip. */
export const TOTAL_MILES = WAYPOINTS.reduce((s, w) => s + w.milesFromPrev, 0);
