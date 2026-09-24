import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { asset } from "@/lib/asset";
import { splitStatWords, statIconPath, STATS, type StatKey } from "@/lib/stat-meta";

export type { StatKey };

/**
 * The in-game stat icon (CommunityDragon's text icons, mirrored into
 * public/assets/stats by `npm run sync-stat-icons`): the same sword, sparkle,
 * heart, shields… the tooltips draw. Sized in `em` by default so it follows
 * the text around it. Accessible name = the stat's full name (also a tooltip).
 */
export function StatIcon({ stat, size = "1.1em", className = "", style, title }: { stat: StatKey; size?: number | string; className?: string; style?: CSSProperties; title?: string }) {
  const label = title ?? STATS[stat].name;
  return (
    <Image
      src={asset(statIconPath(stat))}
      alt={label}
      title={label}
      width={20}
      height={20}
      className={`inline-block shrink-0 align-[-0.2em] ${className}`}
      style={{ width: size, height: size, ...style }}
      unoptimized
    />
  );
}

/**
 * Icon + short label in the stat colour, for stat bars and tables
 * ("⚔ AD", "✦ AP"). Pass `label` to replace the short label with a longer
 * one, or `children` to append a value.
 */
export function StatChip({ stat, label, children, size = "1.1em", className = "" }: { stat: StatKey; label?: ReactNode; children?: ReactNode; size?: number | string; className?: string }) {
  const meta = STATS[stat];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <StatIcon stat={stat} size={size} />
      <span style={{ color: meta.color }}>{label ?? meta.label}</span>
      {children}
    </span>
  );
}

/**
 * Prose with an icon in front of every stat word ("Attack Damage", "Armor",
 * "HP"…). Abbreviations only count in upper case, so ordinary words like
 * "as" are left alone.
 */
export function StatWords({ text, className = "" }: { text: string; className?: string }) {
  const parts = splitStatWords(text);
  if (parts.length === 1 && typeof parts[0] === "string") return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <span key={i} className="whitespace-nowrap">
            <StatIcon stat={p.stat} className="mr-0.5" />
            {p.text}
          </span>
        ),
      )}
    </span>
  );
}
