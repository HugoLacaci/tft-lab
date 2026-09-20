import Image from "next/image";
import { asset } from "@/lib/asset";
import { costColor } from "@/lib/costs";
import type { AugmentTier, TraitStyle } from "@/lib/types";

/**
 * Hexagonal portraits, like the board tiles: an outer hex in the cost colour
 * (or the gold trim for items) and an inner hex holding the art.
 */
function HexFrame({ color, size, className = "", children }: { color: string; size: number; className?: string; children: React.ReactNode }) {
  return (
    <span className={`hex relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size * 1.1547, background: color }}>
      <span className="hex block overflow-hidden bg-[var(--bg-raised)]" style={{ width: size * 0.88, height: size * 1.1547 * 0.88 }}>
        {children}
      </span>
    </span>
  );
}

/** Champion portrait in a cost-coloured hex. */
export function UnitIcon({ icon, name, cost, size = 48, className = "" }: { icon: string; name: string; cost: number; size?: number; className?: string }) {
  return (
    <HexFrame color={costColor(cost)} size={size} className={className}>
      {icon ? (
        <Image src={asset(icon)} alt={name} width={size} height={size} className="object-cover" style={{ width: "100%", height: "100%" }} unoptimized />
      ) : (
        <span className="display flex h-full w-full items-center justify-center text-xs text-dim">{name.slice(0, 2)}</span>
      )}
    </HexFrame>
  );
}

export function TraitIcon({ icon, name, size = 20, className = "" }: { icon: string; name: string; size?: number; className?: string }) {
  if (!icon) return <span className={`inline-block h-5 w-5 rotate-45 border border-gold ${className}`} aria-hidden />;
  return <Image src={asset(icon)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ width: size, height: size }} unoptimized />;
}

/** Item art in a gold-trimmed hex. */
export function ItemIcon({ icon, name, size = 32, className = "" }: { icon: string; name: string; size?: number; className?: string }) {
  return (
    <HexFrame color="var(--gold-dim)" size={size} className={className}>
      {icon ? (
        <Image src={asset(icon)} alt={name} width={size} height={size} className="object-cover" style={{ width: "100%", height: "100%" }} unoptimized />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-dim">?</span>
      )}
    </HexFrame>
  );
}

export function CostPip({ cost }: { cost: number }) {
  return (
    <span
      className="display inline-flex h-5 min-w-5 items-center justify-center px-1 text-[0.7rem] font-bold text-[var(--bg-deep)]"
      style={{ background: costColor(cost) }}
      aria-label={`${cost}-cost`}
    >
      {cost}
    </span>
  );
}

export function StyleBadge({ style, children }: { style: TraitStyle; children: React.ReactNode }) {
  const isPrism = style === "prismatic";
  return (
    <span
      className={`display inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider ${isPrism ? "prismatic-badge" : ""}`}
      style={isPrism ? undefined : { color: `var(--style-${style})`, border: `1px solid var(--style-${style})` }}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: AugmentTier }) {
  const map: Record<AugmentTier, TraitStyle> = { silver: "silver", gold: "gold", prismatic: "prismatic" };
  return <StyleBadge style={map[tier]}>{tier}</StyleBadge>;
}
