import Link from "next/link";
import { UnitIcon } from "@/components/set/icons";
import { Glyph } from "@/components/ui/Glyphs";
import { loadComps, TIER_ORDER, type Comp } from "@/lib/comps";
import { unitLookup } from "@/lib/set-data";
import { compsFreshness } from "@/lib/live-patch";

const TIER_COLOR: Record<Comp["tier"], string> = { S: "#ffb642", A: "#1bc47d", B: "#2f7fdc", C: "#a3b0bd", X: "#c440e0" };
const STYLE_LABEL: Record<Comp["style"], string> = { "fast-9": "Fast 9", reroll: "Reroll", standard: "Standard", emblem: "Emblem" };

/**
 * Home-page card: the strongest comps this patch, each with its final board
 * in unit icons. The whole card links to the tier list; each row deep-links
 * to its comp. Server component: reads the curated file at build time.
 */
export function CompsSpotlight({ limit = 6 }: { limit?: number }) {
  const file = loadComps();
  if (!file || file.comps.length === 0) return null;
  const units = unitLookup();
  const fresh = compsFreshness();
  const top = [...file.comps].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name)).slice(0, limit);
  const counts = file.comps.reduce<Record<string, number>>((m, c) => ({ ...m, [c.tier]: (m[c.tier] ?? 0) + 1 }), {});
  return (
    <div className="panel panel-glow spotlight rise" style={{ ["--panel-glow" as string]: "rgba(255, 182, 66, 0.7)", ["--i" as string]: 2 } as React.CSSProperties} data-testid="comps-spotlight">
      <span className="panel-glow-line" aria-hidden />
      <div className="spotlight-head">
        <Glyph name="comps" size={18} className="text-gold" />
        <div className="min-w-0">
          <div className="display text-[0.62rem] uppercase tracking-[0.25em] text-gold">Comps tier list</div>
          <div className="display truncate text-base text-gold-bright">Best comps · patch {fresh.live.label}</div>
        </div>
        <div className="ml-auto flex gap-1" aria-label="Comps per tier">
          {(["S", "A", "B"] as const)
            .filter((t) => counts[t])
            .map((t) => (
              <span key={t} className="tier-hex h-6 w-5 text-[0.65rem]" style={{ background: TIER_COLOR[t] }} title={`${counts[t]} ${t}-tier comps`}>
                {t}
              </span>
            ))}
        </div>
      </div>
      <ul>
        {top.map((c) => {
          const seen = new Set<string>();
          const board = c.board.filter(([id]) => (seen.has(id) ? false : (seen.add(id), true))).sort((a, b) => (units[b[0]]?.cost ?? 0) - (units[a[0]]?.cost ?? 0));
          const carries = new Set(c.carries.map((x) => x.championId));
          return (
            <li key={c.id}>
              <Link href={`/set/comps/#comp-${c.id}`} className="spotlight-row hover:no-underline">
                <span className="tier-hex h-7 w-6 text-xs" style={{ background: TIER_COLOR[c.tier] }}>
                  {c.tier}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gold-bright">{c.name}</span>
                  <span className="block text-[0.62rem] uppercase tracking-wider text-dim">{STYLE_LABEL[c.style]}</span>
                </span>
                <span className="spotlight-units">
                  {board.slice(0, 8).map(([id], i) => {
                    const lk = units[id];
                    return lk ? <UnitIcon key={i} icon={lk.icon} name={lk.name} cost={lk.cost} size={26} className={carries.has(id) ? "ring-1 ring-[var(--gold)]" : ""} /> : null;
                  })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/set/comps" className="spotlight-foot hover:no-underline">
        <span>
          All {file.comps.length} comps with positioning, items and augments
          {fresh.stale ? <span className="ml-2 normal-case tracking-normal text-[0.68rem] text-[#ffb642]">· curated on {fresh.curatedPatch}, review pending</span> : null}
        </span>
        <Glyph name="arrow" size={18} />
      </Link>
    </div>
  );
}
