import type { ReactNode } from "react";
import { splitStatWords, statOfMarker, type StatKey } from "@/lib/stat-meta";
import { StatIcon } from "./StatIcon";

type Seg = { kind: "text"; text: string } | { kind: "marker"; label: string; stat: StatKey | null } | { kind: "var"; name: string };

function segments(text: string): Seg[] {
  const out: Seg[] = [];
  const re = /\[\[([^\]]+)\]\]|\{([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "marker", label: m[1], stat: statOfMarker(m[1]) });
    else out.push({ kind: "var", name: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/**
 * Renders description text the way the in-game tooltips do:
 *   - `[[AD]]`-style markers from `renderDescRich` become stat icons
 *     (unknown markers fall back to a small text badge),
 *   - `{Unresolved}` placeholders are dimmed,
 *   - with `words`, plain stat names ("Attack Damage", "Armor", "HP") get an
 *     icon in front of them too — used for augment and trait text, which
 *     ships without icon tokens. A word right after a marker of the same
 *     stat ("[[HP]] Health") keeps the single icon.
 * Keeps line breaks.
 */
export function RichText({ text, className = "", words = false }: { text: string; className?: string; words?: boolean }) {
  const segs = segments(text);
  const parts: ReactNode[] = [];
  let k = 0;
  segs.forEach((s, i) => {
    if (s.kind === "marker") {
      if (s.stat) {
        parts.push(<StatIcon key={k++} stat={s.stat} className="mx-0.5" />);
      } else {
        parts.push(
          <span key={k++} className="mx-0.5 inline-block rounded-sm border border-[var(--gold-dim)] px-1 align-baseline text-[0.62rem] font-semibold uppercase leading-4 tracking-wider text-dim">
            {s.label}
          </span>,
        );
      }
      return;
    }
    if (s.kind === "var") {
      parts.push(
        <span key={k++} className="text-dim" title="Scaling value not published by Riot on this patch">
          {"{"}
          {s.name}
          {"}"}
        </span>,
      );
      return;
    }
    if (!words) {
      parts.push(s.text);
      return;
    }
    const prev = segs[i - 1];
    const afterMarker = prev?.kind === "marker" ? prev.stat : null;
    const wordParts = splitStatWords(s.text);
    wordParts.forEach((p, j) => {
      if (typeof p === "string") {
        parts.push(p);
        return;
      }
      const leading = j === 0 || (j === 1 && typeof wordParts[0] === "string" && wordParts[0].trim() === "");
      if (leading && afterMarker === p.stat) {
        parts.push(p.text);
        return;
      }
      parts.push(
        <span key={k++} className="whitespace-nowrap">
          <StatIcon stat={p.stat} className="mr-0.5" />
          {p.text}
        </span>,
      );
    });
  });
  return <span className={`whitespace-pre-line ${className}`}>{parts}</span>;
}
