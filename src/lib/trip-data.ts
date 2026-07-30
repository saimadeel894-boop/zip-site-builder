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
  "indiana-dunes",
  "st-louis",
  "hot-springs",
  "nashville",
  "mammoth-cave",
  "lake-cumberland",
  "new-river",
  "home-return",
] as const;

const MILES: Record<string, number> = {
  home: 0,
  "indiana-dunes": 330,
  "st-louis": 310,
  "hot-springs": 460,
  nashville: 440,
  "mammoth-cave": 120,
  "lake-cumberland": 110,
  "new-river": 368,
  "home-return": 450,
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
  
  const tension = 0.2;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
    
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export const ROUTE_PATH = buildRoutePath(WAYPOINTS);

/** Total miles across the trip. */
export const TOTAL_MILES = WAYPOINTS.reduce((s, w) => s + w.milesFromPrev, 0);
