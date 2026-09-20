import Image from "next/image";
import { costColor } from "@/lib/costs";
import type { AugmentTier, TraitStyle } from "@/lib/types";

/** Circular champion square with a cost-coloured ring. */
export function UnitIcon({
  icon,
  name,
  cost,
  size = 48,
  className = "",
}: {
  icon: string;
  name: string;
  cost: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-[var(--bg-raised)] ${className}`}
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${costColor(cost)}` }}
    >
      {icon ? (
        <Image src={icon} alt={name} width={size} height={size} className="h-full w-full object-cover" unoptimized />
      ) : (
        <span className="display flex h-full w-full items-center justify-center text-xs text-dim">{name.slice(0, 2)}</span>
      )}
    </span>
  );
}

export function TraitIcon({ icon, name, size = 20, className = "" }: { icon: string; name: string; size?: number; className?: string }) {
  if (!icon) return <span className={`inline-block h-5 w-5 rotate-45 border border-gold ${className}`} aria-hidden />;
  return <Image src={icon} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ width: size, height: size }} unoptimized />;
}

export function ItemIcon({ icon, name, size = 32, className = "" }: { icon: string; name: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden border border-[var(--gold-dim)] bg-[var(--bg-raised)] ${className}`}
      style={{ width: size, height: size }}
    >
      {icon ? (
        <Image src={icon} alt={name} width={size} height={size} className="h-full w-full object-cover" unoptimized />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-dim">?</span>
      )}
    </span>
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
      className={`display inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider ${isPrism ? "prismatic text-[#1a1030]" : ""}`}
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
