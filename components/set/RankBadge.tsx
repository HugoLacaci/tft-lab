import type { Rank } from "@/lib/tiers";

const COLOR: Record<Rank, string> = {
  S: "#ffb642",
  A: "#1bc47d",
  B: "#2f7fdc",
  C: "#a3b0bd",
  D: "#b06d3a",
  F: "#e0483a",
};

/** Small hex "S…F" strength badge for the current patch. */
export function RankBadge({ rank, size = 18, title }: { rank: Rank | undefined; size?: number; title?: string }) {
  if (!rank) return null;
  return (
    <span
      className="hex display inline-flex shrink-0 items-center justify-center font-bold leading-none text-[var(--bg-deep)]"
      style={{ width: size, height: size * 1.1547, background: COLOR[rank], fontSize: size * 0.6 }}
      title={title ?? `${rank} tier this patch`}
      aria-label={`${rank} tier`}
    >
      {rank}
    </span>
  );
}
