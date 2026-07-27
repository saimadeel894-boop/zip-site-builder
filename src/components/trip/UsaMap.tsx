import { US_NATION_PATH, US_STATE_PATHS } from "@/lib/us-map-generated";

/**
 * Accurate continental US map, projected server-side with Albers-USA
 * (see scripts/build-us-map.mjs). Native canvas is 975 × 610.
 */
export function UsaMap() {
  return (
    <g>
      {/* Water backdrop */}
      <rect x={0} y={0} width={975} height={610} fill="var(--map-water)" />

      {/* Subtle latitude grid for map texture */}
      <g opacity={0.5} stroke="var(--map-land-stroke)" strokeWidth={0.3}>
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={70 + i * 70} x2={975} y2={70 + i * 70} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={80 + i * 90} y1={0} x2={80 + i * 90} y2={610} />
        ))}
      </g>

      {/* Nation drop shadow */}
      <path
        d={US_NATION_PATH}
        fill="rgba(15, 23, 42, 0.10)"
        transform="translate(0, 6)"
        style={{ filter: "blur(6px)" }}
      />

      {/* Individual states — filled with land tone, thin borders */}
      <g fill="var(--map-land)" stroke="var(--map-land-stroke)" strokeWidth={0.5} strokeLinejoin="round">
        {US_STATE_PATHS.map((s) => (
          <path key={s.id} d={s.d} />
        ))}
      </g>

      {/* Nation outline for a crisp edge */}
      <path
        d={US_NATION_PATH}
        fill="none"
        stroke="var(--map-nation-stroke)"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </g>
  );
}