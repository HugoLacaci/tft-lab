import type { RankTier } from "@/lib/rank-tiers";

/**
 * Faceted crystal in the tier's colour: the rank emblem for the puzzle ladder.
 * Pure SVG, tinted by `tier.color`; level 4 gets a small crown of shards.
 */
export function RankEmblem({ tier, size = 48, className = "", spin = false }: { tier: RankTier; size?: number; className?: string; spin?: boolean }) {
  const id = `rank-${tier.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} role="img" aria-label={`${tier.label} emblem`}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={tier.color} />
          <stop offset="1" stopColor={tier.color} stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={tier.color} stopOpacity="0.55" />
          <stop offset="1" stopColor={tier.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="34" r="30" fill={`url(#${id}-glow)`} />
      <g className={spin ? "hex-spin-rev" : undefined} opacity="0.55">
        <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="none" stroke={tier.color} strokeWidth="1" strokeDasharray="6 4" />
      </g>
      {/* gem */}
      <polygon points="32,12 50,24 44,50 20,50 14,24" fill={`url(#${id}-g)`} stroke={tier.color} strokeWidth="1.2" />
      <polygon points="32,12 50,24 32,30" fill="#ffffff" opacity="0.35" />
      <polygon points="32,12 14,24 32,30" fill="#ffffff" opacity="0.18" />
      <polygon points="14,24 32,30 20,50" fill="#000000" opacity="0.18" />
      <polygon points="50,24 32,30 44,50" fill="#000000" opacity="0.28" />
      <polygon points="32,30 44,50 20,50" fill="#000000" opacity="0.1" />
      {tier.level >= 4 ? (
        <g fill={tier.color} opacity="0.95">
          <polygon points="22,10 26,2 28,10" />
          <polygon points="30,8 32,-1 34,8" />
          <polygon points="36,10 38,2 42,10" />
        </g>
      ) : null}
      {tier.level >= 3 ? <circle cx="32" cy="30" r="2.2" fill="#ffffff" opacity="0.9" /> : null}
    </svg>
  );
}
