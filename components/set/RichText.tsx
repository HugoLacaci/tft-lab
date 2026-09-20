import type { ReactNode } from "react";

/** Colour per stat marker, mirroring the in-game tooltip icons. */
const MARK: Record<string, string> = {
  AD: "#ff9a3c",
  AP: "#3fa9f5",
  HP: "#38c172",
  Armor: "#ffb642",
  MR: "#d7c8ff",
  AS: "#f5d33f",
  Mana: "#3fa9f5",
  "Mana regen": "#3fa9f5",
  Crit: "#e0483a",
  "Crit dmg": "#e0483a",
  "Dmg amp": "#e0483a",
  Durability: "#a3b0bd",
  Omnivamp: "#e05a8a",
  Range: "#a3b0bd",
};

/**
 * Renders `[[AD]]`-style markers from `renderDescRich` as coloured badges and
 * `{Unresolved}` placeholders dimmed. Keeps line breaks.
 */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /\[\[([^\]]+)\]\]|\{([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const label = m[1];
      parts.push(
        <span key={k++} className="mx-0.5 inline-block rounded-sm px-1 align-baseline text-[0.62rem] font-semibold uppercase leading-4 tracking-wider" style={{ background: `${MARK[label] ?? "#8fa3b8"}22`, color: MARK[label] ?? "#8fa3b8", border: `1px solid ${MARK[label] ?? "#8fa3b8"}66` }}>
          {label}
        </span>,
      );
    } else {
      parts.push(
        <span key={k++} className="text-dim" title="Scaling value not published by Riot on this patch">
          {"{"}
          {m[2]}
          {"}"}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={`whitespace-pre-line ${className}`}>{parts}</span>;
}
