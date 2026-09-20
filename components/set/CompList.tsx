"use client";

/**
 * Curated comps for the live set, TFT-Academy style: a tier list of cards that
 * expand into the full guide (board with positioning, carries and items, flex
 * and late units, augments, how to play).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Board } from "@/components/board/Board";
import type { Comp, CompsFile } from "@/lib/comps";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import type { Rank } from "@/lib/tiers";
import { ItemIcon, TierBadge, TraitIcon, UnitIcon } from "./icons";
import { RankBadge } from "./RankBadge";

const TIER_ORDER: Record<Comp["tier"], number> = { S: 0, A: 1, B: 2, C: 3, X: 4 };

export interface LiveComp {
  key: string;
  name: string;
  games: number;
  avg: number;
  top4: number;
  win: number;
  units: { id: string; freq: number; items: string[] }[];
}
export interface LiveMeta {
  patch: string;
  syncedAt: string;
  matches: number;
  comps: LiveComp[];
}

export interface CompListProps {
  file: CompsFile;
  /** live clusters from data/generated/meta.json (optional) */
  meta?: LiveMeta | null;
  /** curated comp id → matching live cluster, computed server-side */
  live?: Record<string, LiveComp>;
  units: Record<string, UnitLookup>;
  items: Record<string, ItemLookup>;
  traitNames: Record<string, string>;
  /** trait id → icon + breakpoints, for the visual trait list */
  traits?: Record<string, { id: string; name: string; icon: string; breakpoints: { units: number; style: string }[] }>;
  augments: Record<string, { id: string; name: string; icon: string; tier: "silver" | "gold" | "prismatic"; desc: string }>;
  itemRanks: Record<string, Rank>;
  augmentRanks: Record<string, Rank>;
}

const TIER_COLOR: Record<Comp["tier"], string> = { S: "#ffb642", A: "#1bc47d", B: "#2f7fdc", C: "#a3b0bd", X: "#c440e0" };
const TIER_LABEL: Record<Comp["tier"], string> = { S: "S tier", A: "A tier", B: "B tier", C: "C tier", X: "Situational" };
const STYLE_LABEL: Record<Comp["style"], string> = { "fast-9": "Fast 9", reroll: "Reroll", standard: "Standard", emblem: "Emblem / augment" };

export function CompList({ file, meta, live = {}, units, items, traitNames, traits = {}, augments, itemRanks, augmentRanks }: CompListProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [style, setStyle] = useState<Comp["style"] | "">("");
  const [q, setQ] = useState("");
  const sorted = useMemo(() => [...file.comps].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name)), [file.comps]);
  const list = sorted.filter((c) => (!style || c.style === style) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.board.some((u) => units[u[0]]?.name.toLowerCase().includes(q.toLowerCase()))));
  const tiers = (["S", "A", "B", "C", "X"] as Comp["tier"][]).filter((t) => list.some((c) => c.tier === t));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search comp or unit" aria-label="Search comps" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Style">
          {(Object.keys(STYLE_LABEL) as Comp["style"][]).map((s) => (
            <button key={s} type="button" className={`chip ${style === s ? "chip-active" : ""}`} aria-pressed={style === s} onClick={() => setStyle(style === s ? "" : s)}>
              {STYLE_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="text-xs text-dim">
          Patch {file.patch} · curated {file.verifiedOn} · click a comp to open the guide
        </span>
      </div>

      {tiers.map((t) => (
        <section key={t} aria-label={TIER_LABEL[t]}>
          <div className="mb-2 flex items-center gap-2">
            <span className="hex display flex h-8 w-7 items-center justify-center text-sm font-bold text-[var(--bg-deep)]" style={{ background: TIER_COLOR[t] }}>
              {t}
            </span>
            <span className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">{TIER_LABEL[t]}</span>
          </div>
          <ul className="space-y-2">
            {list
              .filter((c) => c.tier === t)
              .map((c) => (
                <li key={c.id}>
                  <CompCard comp={c} liveStat={live[c.id]} isOpen={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} units={units} items={items} traitNames={traitNames} traits={traits} augments={augments} itemRanks={itemRanks} augmentRanks={augmentRanks} />
                </li>
              ))}
          </ul>
        </section>
      ))}

      {meta && meta.comps.length ? (
        <section aria-label="Live meta">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <span className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Live meta · what the top ladder is playing</span>
            <span className="text-xs text-dim">
              {meta.matches} ranked games on patch {meta.patch}, synced {meta.syncedAt.slice(0, 10)} from the Riot API; clusters by the two strongest traits on the final board.
            </span>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {meta.comps.slice(0, 12).map((m) => (
              <li key={m.key} className="panel p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm text-gold-bright">{m.name}</span>
                  <span className="text-xs tabular-nums" style={{ color: m.avg <= 4 ? "var(--teal)" : m.avg >= 4.6 ? "var(--red)" : undefined }}>
                    avg {m.avg.toFixed(2)}
                  </span>
                  <span className="text-[0.65rem] text-dim">
                    {Math.round(m.top4 * 100)}% top 4 · {Math.round(m.win * 100)}% wins · {m.games} boards
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.units.map((u) => {
                    const lk = units[u.id];
                    return lk ? (
                      <span key={u.id} className="inline-flex flex-col items-center" title={`${lk.name} in ${Math.round(u.freq * 100)}% of boards`}>
                        <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={30} />
                        <span className="mt-0.5 flex gap-px">
                          {u.items.map((id, j) => (
                            <ItemIcon key={j} icon={items[id]?.icon ?? ""} name={items[id]?.name ?? id} size={10} />
                          ))}
                        </span>
                      </span>
                    ) : null;
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-dim">
        Curated by hand from published meta snapshots ({file.sources.map((s, i) => (
          <span key={s}>
            {i ? ", " : ""}
            <a href={s} target="_blank" rel="noreferrer">
              {new URL(s).hostname}
            </a>
          </span>
        ))}
        ). Tiers are opinion, not win rates; the positioning shown is a neutral default to adjust after scouting.
      </p>
    </div>
  );
}

function CompCard({
  comp: c,
  liveStat,
  isOpen,
  onToggle,
  units,
  items,
  traitNames,
  traits = {},
  augments,
  itemRanks,
  augmentRanks,
}: { comp: Comp; liveStat?: LiveComp; isOpen: boolean; onToggle: () => void } & Omit<CompListProps, "file" | "meta" | "live">) {
  const board = c.board.map(([championId, row, col, star, its]) => ({ championId, row, col, star, items: its }));
  const carries = new Set(c.carries.map((x) => x.championId));
  const ordered = [...board].sort((a, b) => (carries.has(b.championId) ? 1 : 0) - (carries.has(a.championId) ? 1 : 0) || (units[b.championId]?.cost ?? 0) - (units[a.championId]?.cost ?? 0));
  const activeTraits = useMemo(() => {
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    for (const u of board) {
      const lk = units[u.championId];
      if (!lk) continue;
      const key = lk.name;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const t of lk.traits) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts]
      .map(([id, n]) => {
        const bps = traits[id]?.breakpoints ?? [];
        let style: string | null = null;
        let next: number | null = null;
        for (const bp of bps) {
          if (n >= bp.units) style = bp.style;
          else if (next === null) next = bp.units;
        }
        return { id, n, style, next };
      })
      .sort((a, b) => (b.style ? 1 : 0) - (a.style ? 1 : 0) || b.n - a.n);
  }, [board, units, traits]);
  return (
    <div className={`panel ${isOpen ? "panel-raised" : ""}`}>
      <button type="button" className="flex w-full flex-wrap items-center gap-3 p-3 text-left" onClick={onToggle} aria-expanded={isOpen}>
        <span className="hex display flex h-7 w-6 shrink-0 items-center justify-center text-xs font-bold text-[var(--bg-deep)]" style={{ background: TIER_COLOR[c.tier] }}>
          {c.tier}
        </span>
        <span className="min-w-[10rem]">
          <span className="block text-sm text-gold-bright">{c.name}</span>
          <span className="block text-[0.65rem] uppercase tracking-wider text-dim">
            {STYLE_LABEL[c.style]}
            {liveStat ? (
              <span className="ml-2 normal-case tracking-normal" style={{ color: liveStat.avg <= 4 ? "var(--teal)" : liveStat.avg >= 4.6 ? "var(--red)" : undefined }} title={`Live: ${liveStat.games} top-ladder boards`}>
                avg {liveStat.avg.toFixed(2)} live
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex flex-wrap gap-1">
          {ordered.map((u, i) => {
            const lk = units[u.championId];
            if (!lk) return null;
            return (
              <span key={i} className="relative inline-flex flex-col items-center" title={`${lk.name} ${"★".repeat(u.star)}`}>
                <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={34} className={carries.has(u.championId) ? "ring-2 ring-[var(--gold)]" : ""} />
                {u.items.length ? (
                  <span className="mt-0.5 flex gap-px">
                    {u.items.map((id, j) => (
                      <ItemIcon key={j} icon={items[id]?.icon ?? ""} name={items[id]?.name ?? id} size={11} />
                    ))}
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
        <span className="ml-auto hidden flex-wrap gap-1 text-[0.65rem] text-dim md:flex">
          {activeTraits.slice(0, 5).map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 border px-1" style={{ borderColor: t.style ? `var(--style-${t.style})` : "var(--gold-dim)", color: t.style ? "var(--gold-bright)" : undefined }}>
              <TraitIcon icon={traits[t.id]?.icon ?? ""} name={traitNames[t.id] ?? t.id} size={11} />
              {traitNames[t.id] ?? t.id} {t.n}
            </span>
          ))}
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-[var(--gold-dim)] p-3 sm:p-4">
          <p className="text-sm">{c.summary}</p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Traits on the final board">
            {activeTraits.map((t) => (
              <li key={t.id} className="flex items-center gap-1.5" title={`${traitNames[t.id] ?? t.id}: ${t.n}${t.next ? ` (next ${t.next})` : ""}`}>
                <span className="hex flex h-7 w-7 shrink-0 items-center justify-center" style={{ background: t.style ? `var(--style-${t.style})` : "var(--bg-raised)" }}>
                  <span className="hex flex h-[85%] w-[85%] items-center justify-center bg-[var(--bg-deep)]">
                    <TraitIcon icon={traits[t.id]?.icon ?? ""} name={traitNames[t.id] ?? t.id} size={14} />
                  </span>
                </span>
                <span className="leading-tight">
                  <span className={`block text-[0.7rem] ${t.style ? "text-gold-bright" : "text-dim"}`}>{traitNames[t.id] ?? t.id}</span>
                  <span className="text-[0.62rem] tabular-nums" style={{ color: t.style ? `var(--style-${t.style})` : "var(--text-dim)" }}>
                    {t.n}
                    <span className="text-dim">{t.next ? ` / ${t.next}` : ""}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Positioning</div>
              <div className="panel p-2">
                <Board mode="own" readonly board={board} units={units} items={items} traitNames={traitNames} chrome={false} maxHex={52} />
              </div>
              <p className="mt-2 text-xs text-dim">{c.positioning}</p>
              <Link href={`/lab/board/#f=${encodePlanner(board)}`} className="btn btn-sm mt-2">
                Open in the team planner
              </Link>
              {c.stages ? (
                <div className="mt-4">
                  <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Stage by stage</div>
                  <dl className="space-y-1.5 text-xs">
                    {(["stage2", "stage3", "stage4", "stage5"] as const).map((k, i) => (
                      <div key={k} className="grid grid-cols-[3.5rem_1fr] gap-2">
                        <dt className="display text-gold-bright">Stage {i + 2}</dt>
                        <dd className="text-ink">{c.stages![k]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              <div className="mt-4">
                <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">How to play</div>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {c.howToPlay.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Carries &amp; best items</div>
                <ul className="space-y-2">
                  {c.carries.map((x) => {
                    const lk = units[x.championId];
                    return (
                      <li key={x.championId} className="flex items-start gap-2">
                        {lk ? <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={32} /> : null}
                        <span className="min-w-0">
                          <span className="text-gold-bright">{lk?.name ?? x.championId}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {x.items.map((id, j) => (
                              <span key={j} className="inline-flex items-center gap-1 text-xs">
                                <ItemIcon icon={items[id]?.icon ?? ""} name={items[id]?.name ?? id} size={20} />
                                {items[id]?.name ?? id}
                                <RankBadge rank={itemRanks[id]} size={13} />
                              </span>
                            ))}
                          </span>
                          {x.note ? <span className="block text-xs text-dim">{x.note}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {c.flex.length ? <RefList title="Flexible units" refs={c.flex} units={units} /> : null}
              {c.extra.length ? <RefList title="Extra / late units" refs={c.extra} units={units} /> : null}
              {c.augments.length ? (
                <div>
                  <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Best augments</div>
                  <ul className="space-y-1">
                    {c.augments.map((a) => {
                      const ag = augments[a.augmentId];
                      return (
                        <li key={a.augmentId} className="flex flex-wrap items-center gap-2 text-xs">
                          {ag ? <ItemIcon icon={ag.icon} name={ag.name} size={22} /> : null}
                          <span className="text-gold-bright">{ag?.name ?? a.augmentId}</span>
                          {ag ? <TierBadge tier={ag.tier} /> : null}
                          <RankBadge rank={augmentRanks[a.augmentId]} size={13} />
                          {a.note ? <span className="text-dim">{a.note}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RefList({ title, refs, units }: { title: string; refs: { championId: string; note?: string }[]; units: Record<string, UnitLookup> }) {
  return (
    <div>
      <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">{title}</div>
      <ul className="space-y-1">
        {refs.map((r) => {
          const lk = units[r.championId];
          return (
            <li key={r.championId} className="flex items-center gap-2 text-xs">
              {lk ? <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={24} /> : null}
              <span className="text-gold-bright">{lk?.name ?? r.championId}</span>
              {r.note ? <span className="text-dim">{r.note}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Same encoding as the planner's share link: planner mode, comp on the blue board. */
function encodePlanner(board: { championId: string; row: number; col: number; star: 1 | 2 | 3; items: string[] }[]): string {
  const json = JSON.stringify({ m: "planner", b: { units: board, augments: [] }, r: { units: [], augments: [] } });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
