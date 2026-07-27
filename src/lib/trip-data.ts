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
  "indiana-dunes": 300,
  "st-louis": 300,
  "hot-springs": 400,
  nashville: 410,
  "mammoth-cave": 100,
  "lake-cumberland": 80,
  "new-river": 300,
  "home-return": 230,
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
 * Build the route as a single, one-directional polyline: straight point-to-point
 * segments in trip order. Corners get a small rounded fillet, which never
 * overshoots a waypoint, so the line can't loop or cross itself.
 */
export function buildRoutePath(points: { x: number; y: number }[], radius = 14): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, r: number) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.min(r, len / 2) / len;
    return { x: a.x + dx * t, y: a.y + dy * t };
  };

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inPt = lerp(cur, prev, radius);
    const outPt = lerp(cur, next, radius);
    d.push(`L ${inPt.x} ${inPt.y}`);
    d.push(`Q ${cur.x} ${cur.y}, ${outPt.x} ${outPt.y}`);
  }
  const last = points[points.length - 1];
  d.push(`L ${last.x} ${last.y}`);
  return d.join(" ");
}

export const ROUTE_PATH = buildRoutePath(WAYPOINTS);

/** Total miles across the trip. */
export const TOTAL_MILES = WAYPOINTS.reduce((s, w) => s + w.milesFromPrev, 0);
