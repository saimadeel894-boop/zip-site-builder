import { motion } from "framer-motion";
import { DestinationIcon } from "./DestinationIcons";
import type { Waypoint } from "@/lib/trip-data";

type Props = {
  waypoint: Waypoint;
  /** Show pin + badge. */
  visible: boolean;
  /** Compact ("summary") variant for the final overview. */
  compact?: boolean;
};

const PIN_HEIGHT = 34;
// Vertical distance from the pin tip to the icon-badge center.
const ICON_OFFSET = 34;
// Icon badge outer radius (matches the visual ring below).
const ICON_RADIUS = 17;
// Minimum breathing room between the icon badge and the label rect (>= 16px).
const LABEL_GAP = 18;

export function Pin({ waypoint, visible, compact = false }: Props) {
  const iconSize = compact ? 16 : 22;
  const side = waypoint.labelSide;
  const labelW = Math.max(104, waypoint.name.length * 8.6 + 26);
  const labelH = 34;
  const iconTopY = -PIN_HEIGHT - ICON_OFFSET - ICON_RADIUS;
  const iconBottomY = -PIN_HEIGHT - ICON_OFFSET + ICON_RADIUS;

  // Label positions: keep >= LABEL_GAP away from the icon badge in every direction.
  const labelPos =
    side === "left"
      ? { x: -labelW - (ICON_RADIUS + LABEL_GAP), y: -PIN_HEIGHT - ICON_OFFSET }
      : side === "top"
        ? { x: -labelW / 2, y: iconTopY - LABEL_GAP - labelH / 2 }
        : side === "bottom"
          ? { x: -labelW / 2, y: iconBottomY + LABEL_GAP + labelH / 2 }
          : { x: ICON_RADIUS + LABEL_GAP, y: -PIN_HEIGHT - ICON_OFFSET };

  return (
    <g data-map-pin={waypoint.id} style={{ transform: `translate(${waypoint.x}px, ${waypoint.y}px)` }}>
      {/* drop pin */}
      <motion.g
        initial={{ y: -30, opacity: 0 }}
        animate={visible ? { y: 0, opacity: 1 } : { y: -30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
      >
        <ellipse cx={0} cy={2} rx={5} ry={1.4} fill="rgba(15,23,42,0.28)" />
        <path
          d={`M 0 ${-PIN_HEIGHT} C ${PIN_HEIGHT * 0.5} ${-PIN_HEIGHT} ${PIN_HEIGHT * 0.5} ${-PIN_HEIGHT * 0.35} 0 0
              C ${-PIN_HEIGHT * 0.5} ${-PIN_HEIGHT * 0.35} ${-PIN_HEIGHT * 0.5} ${-PIN_HEIGHT} 0 ${-PIN_HEIGHT} Z`}
          fill="var(--pin)"
          stroke="var(--pin-deep)"
          strokeWidth={0.8}
        />
        <circle cx={0} cy={-PIN_HEIGHT * 0.65} r={PIN_HEIGHT * 0.22} fill="#ffffff" />
      </motion.g>

      {/* icon badge above the pin */}
      {!compact && (
        <motion.g
          data-map-icon={waypoint.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={visible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
          style={{ transform: `translate(0px, ${-PIN_HEIGHT - ICON_OFFSET}px)` }}
        >
          <circle r={ICON_RADIUS} fill="#ffffff" stroke="var(--pin)" strokeWidth={1.4} />
          <circle r={ICON_RADIUS + 3} fill="none" stroke="var(--pin)" strokeWidth={0.6} opacity={0.35} />
          <g style={{ transform: `translate(-${iconSize / 2}px, -${iconSize / 2}px)`, color: "var(--deep)" }}>
            <DestinationIcon icon={waypoint.icon} size={iconSize} />
          </g>
        </motion.g>
      )}

      {/* name label */}
      {!compact && (
        <motion.g
          data-map-label={waypoint.id}
          initial={{ opacity: 0, y: 6 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{ transform: `translate(${labelPos.x}px, ${labelPos.y}px)` }}
        >
          <rect
            x={0}
            y={-labelH / 2}
            width={labelW}
            height={labelH}
            rx={8}
            fill="#ffffff"
            stroke="var(--border)"
            strokeWidth={0.9}
          />
          <text
            x={12}
            y={-2}
            fontSize={11.5}
            fontWeight={700}
            fill="var(--deep)"
            letterSpacing={0.6}
          >
            {waypoint.name.toUpperCase()}
          </text>
          {waypoint.region && (
            <text
              x={12}
              y={12}
              fontSize={8.5}
              fontWeight={600}
              fill="var(--muted-foreground)"
              letterSpacing={0.4}
            >
              {waypoint.region}
            </text>
          )}
        </motion.g>
      )}

    </g>
  );
}