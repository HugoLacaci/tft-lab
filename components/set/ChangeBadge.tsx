import type { ChangeKind, CompChange } from "@/lib/comps-changes";

/** Icon + label for a comp change kind (see lib/comps-changes.ts). */
export const CHANGE_META: Record<ChangeKind, { label: string; color: string; title: string }> = {
  new: { label: "New", color: "var(--teal)", title: "New comp since the previous patch" },
  up: { label: "Up", color: "#1bc47d", title: "Moved up a tier" },
  down: { label: "Down", color: "var(--red)", title: "Moved down a tier" },
  adjusted: { label: "Adjusted", color: "var(--gold)", title: "Board, items, augments or notes changed" },
};

export function ChangeIcon({ kind, size = 12 }: { kind: ChangeKind; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "new":
      return (
        <svg {...common}>
          <path d="M8 1.5l1.6 4 4.4.4-3.3 2.9 1 4.4L8 11l-3.7 2.2 1-4.4L2 5.9l4.4-.4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "up":
      return (
        <svg {...common}>
          <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
        </svg>
      );
    case "down":
      return (
        <svg {...common}>
          <path d="M8 3v10M3.5 8.5L8 13l4.5-4.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M10.5 2.5l3 3L6 13H3v-3z" />
          <path d="M9 4l3 3" />
        </svg>
      );
  }
}

/** Compact badge for a comp card: kind + tier move. */
export function ChangeBadge({ change, className = "" }: { change: CompChange; className?: string }) {
  const m = CHANGE_META[change.kind];
  const move = change.from && change.to ? ` ${change.from} → ${change.to}` : "";
  return (
    <span className={`display pop inline-flex items-center gap-1 border px-1 py-px text-[0.58rem] font-bold uppercase tracking-[0.12em] ${className}`} style={{ color: m.color, borderColor: m.color }} title={`${m.title}${move}${change.details.length ? `: ${change.details.join(" · ")}` : ""}`}>
      <ChangeIcon kind={change.kind} />
      {m.label}
      {move}
    </span>
  );
}
