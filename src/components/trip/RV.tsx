import { memo } from "react";
import { motion } from "framer-motion";

type Props = {
  /** Whether the wheels should spin (driving). */
  spinning: boolean;
};

/**
 * Top-down/side-hybrid RV. Drawn around origin (0,0) so the parent
 * translates/rotates it into place along the route.
 */
export const RV = memo(function RV({ spinning }: Props) {
  return (
    <g>
      {/* soft shadow */}
      <ellipse cx={0} cy={7} rx={16} ry={3} fill="rgba(15, 23, 42, 0.18)" />

      {/* body */}
      <g>
        <rect x={-15} y={-8} width={26} height={12} rx={3} fill="#ffffff" stroke="var(--deep)" strokeWidth={1.2} />
        {/* cab */}
        <path d="M 11 -6 L 16 -2 L 16 4 L 11 4 Z" fill="#ffffff" stroke="var(--deep)" strokeWidth={1.2} />
        {/* stripe */}
        <rect x={-14} y={-2} width={25} height={2} fill="var(--route)" />
        {/* windows */}
        <rect x={-12} y={-6.5} width={4} height={3} rx={0.6} fill="#c9def7" />
        <rect x={-6.5} y={-6.5} width={4} height={3} rx={0.6} fill="#c9def7" />
        <rect x={-1} y={-6.5} width={4} height={3} rx={0.6} fill="#c9def7" />
        <rect x={12} y={-5} width={3} height={3} rx={0.6} fill="#c9def7" />
        {/* door line */}
        <line x1={4} y1={-2} x2={4} y2={4} stroke="var(--deep)" strokeWidth={0.6} opacity={0.5} />
      </g>

      {/* wheels — spin while moving */}
      <motion.g
        animate={{ rotate: spinning ? 360 : 0 }}
        transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
        style={{ originX: "-9px", originY: "5px" }}
      >
        <circle cx={-9} cy={5} r={2.6} fill="var(--deep)" />
        <rect x={-9.3} y={2.6} width={0.6} height={4.8} fill="#ffffff" opacity={0.7} />
      </motion.g>
      <motion.g
        animate={{ rotate: spinning ? 360 : 0 }}
        transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
        style={{ originX: "7px", originY: "5px" }}
      >
        <circle cx={7} cy={5} r={2.6} fill="var(--deep)" />
        <rect x={6.7} y={2.6} width={0.6} height={4.8} fill="#ffffff" opacity={0.7} />
      </motion.g>
    </g>
  );
});
