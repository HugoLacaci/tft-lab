"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Board } from "@/components/board/Board";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";
import { StatIcon } from "@/components/set/StatIcon";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import type { Decision, GameTimeline } from "@/packages/ontology/ts";
import { fmtStamp } from "@/lib/study-schema";

/**
 * M1 breakdown view: the timeline ribbon (one segment per round state), the
 * selected RoundState on the existing Board, and the Decision that produced
 * it with evidence chips. No verdicts yet (M5); the ribbon is coloured by what
 * the state itself shows: HP lost and whether the decision balanced.
 */
export function AnalysisView({ timeline, decisions, units, items, traitNames, augmentNames }: { timeline: GameTimeline; decisions: Decision[]; units: Record<string, UnitLookup>; items: Record<string, ItemLookup>; traitNames: Record<string, string>; augmentNames: Record<string, string> }) {
  const [idx, setIdx] = useState(Math.max(0, timeline.rounds.length - 1));
  const s = timeline.rounds[idx]!;
  const into = idx > 0 ? decisions[idx - 1] : undefined;
  const name = (id: string) => units[id]?.name ?? items[id]?.name ?? augmentNames[id] ?? id;

  // Ribbon: group states by stage; each state is a tick.
  const stages = useMemo(() => {
    const out: { stage: string; indices: number[] }[] = [];
    timeline.rounds.forEach((r, i) => {
      const last = out[out.length - 1];
      if (last && last.stage === r.stage) last.indices.push(i);
      else out.push({ stage: r.stage, indices: [i] });
    });
    return out;
  }, [timeline.rounds]);

  const lostAt = (i: number) => (i > 0 ? Math.max(0, timeline.rounds[i - 1]!.health - timeline.rounds[i]!.health) : 0);
  const stageLost = (indices: number[]) => Math.max(...indices.map(lostAt), 0);
  const stageLow = (indices: number[]) => indices.some((i) => i > 0 && decisions[i - 1]?.lowConfidence);

  return (
    <div className="space-y-4">
      <Panel as="section" aria-label="Timeline">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Timeline · {timeline.rounds.length} states</div>
          <div className="flex flex-wrap gap-3 text-[0.65rem] text-dim">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[var(--teal)]" /> no HP lost</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[var(--gold)]" /> HP lost</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[var(--red)]" /> heavy loss</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 border border-dashed border-[var(--red)]" /> accounting did not close</span>
          </div>
        </div>
        <ol className="ribbon mt-3" aria-label="Rounds">
          {stages.map(({ stage, indices }) => {
            const lost = stageLost(indices);
            const color = lost === 0 ? "var(--teal)" : lost >= 12 ? "var(--red)" : "var(--gold)";
            const active = indices.includes(idx);
            return (
              <li key={stage} className={`ribbon-seg ${active ? "ribbon-active" : ""} ${stageLow(indices) ? "ribbon-low" : ""}`} style={{ ["--seg" as string]: color } as React.CSSProperties}>
                <button type="button" className="ribbon-btn" onClick={() => setIdx(indices[indices.length - 1]!)} aria-pressed={active} aria-label={`Stage ${stage}${lost ? `, lost ${lost} HP` : ""}`}>
                  <span className="ribbon-bar" />
                  <span className="ribbon-label">{stage}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" className="btn btn-sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
            ← Previous state
          </button>
          <button type="button" className="btn btn-sm" disabled={idx >= timeline.rounds.length - 1} onClick={() => setIdx((i) => Math.min(timeline.rounds.length - 1, i + 1))}>
            Next state →
          </button>
          <span className="chip">stage {s.stage}</span>
          <span className="chip">{s.phase}{s.phaseMoment ? ` · ${s.phaseMoment}` : ""}</span>
          <span className="chip" title="Where this state came from">{s.provenance}</span>
          {s.videoTimestampMs !== undefined ? <span className="chip tabular-nums">▶ {fmtStamp(s.videoTimestampMs / 1000)}</span> : null}
          <span className="ml-auto text-dim">
            state {idx + 1} / {timeline.rounds.length}
          </span>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="panel p-2 sm:p-4">
          <Board
            key={idx}
            mode={s.opponentPreview?.length ? "versus" : "own"}
            readonly
            board={s.board}
            bench={s.bench}
            enemyBoard={s.opponentPreview}
            shop={s.shop}
            status={{ gold: s.gold, hp: s.health, level: s.level, xpToNext: s.xp.needed - s.xp.current, xpNeeded: s.xp.needed, stage: s.stage, streak: s.streak, items: s.benchItems }}
            units={units}
            items={items}
            traitNames={traitNames}
          />
          {s.lobby?.length ? (
            <div className="mt-3 border-t border-[var(--gold-dim)] pt-2">
              <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Lobby</div>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-dim">
                {s.lobby.map((p) => (
                  <li key={p.playerName}>
                    <span className="text-ink">{p.playerName}</span> · {p.health} <StatIcon stat="HP" title="Player health" />{p.level ? ` · lvl ${p.level}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <Panel as="section" aria-label="Decision">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">{into ? `Decision · ${into.fromStage} → ${into.toStage}` : "Opening state"}</div>
            {!into ? (
              <p className="mt-2 text-sm text-dim">The first state in the timeline. Step forward to see what the player did.</p>
            ) : (
              <DecisionPanel d={into} name={name} />
            )}
          </Panel>

          {s.augments.length || s.activeTraits.length ? (
            <Panel as="section" aria-label="Board summary">
              {s.augments.length ? (
                <div className="text-xs text-dim">
                  <span className="text-gold">Augments:</span> {s.augments.map(name).join(" · ")}
                </div>
              ) : null}
              {s.activeTraits.length ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {s.activeTraits.map((t) => (
                    <span key={t.traitId} className="chip">
                      {traitNames[t.traitId] ?? t.traitId} {t.count} · {t.style}
                    </span>
                  ))}
                </div>
              ) : null}
            </Panel>
          ) : null}

          <p className="text-[0.7rem] text-dim">
            Every number here comes from the timeline. <Glyph name="hint" size={11} className="inline text-gold" /> An evidence chip shows the raw field and its confidence; dashed chips are values the accounting could not confirm. Verdicts arrive in a later milestone; this view shows what happened, not yet what should have.
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionPanel({ d, name }: { d: Decision; name: (id: string) => string }) {
  const rows: { k: string; v: React.ReactNode }[] = [];
  rows.push({ k: "Gold", v: `${d.goldStart}${d.income ? ` + ${d.income}${d.incomeEstimated ? " (est.)" : ""}` : ""} → ${d.goldEnd}` });
  if (d.goldSpent) rows.push({ k: "Spent", v: `${d.goldSpent}${d.rolls ? ` · ${d.rolls} roll${d.rolls === 1 ? "" : "s"}` : ""}${d.xpBought ? ` · ${d.xpBought} XP buy${d.xpBought === 1 ? "" : "s"}` : ""}` });
  if (d.interestLost) rows.push({ k: "Interest lost", v: `${d.interestLost} per round` });
  if (d.levelled) rows.push({ k: "Level", v: "levelled up" });
  if (d.bought.length) rows.push({ k: "Bought", v: d.bought.map((b) => `${name(b.championId)}${b.copies > 1 ? ` ×${b.copies}` : ""}`).join(", ") });
  if (d.sold.length) rows.push({ k: "Sold", v: d.sold.map((b) => `${name(b.championId)}${b.copies > 1 ? ` ×${b.copies}` : ""} (+${b.gold})`).join(", ") });
  if (d.starUpsAchieved.length) rows.push({ k: "Star-ups", v: d.starUpsAchieved.map((x) => `${name(x.championId)} ${x.star}★`).join(", ") });
  if (d.itemsCombined.length) rows.push({ k: "Combined", v: d.itemsCombined.map((c) => `${c.from.map(name).join(" + ")} → ${name(c.to)}`).join("; ") });
  if (d.itemsEquipped.length) rows.push({ k: "Equipped", v: d.itemsEquipped.map((e) => `${name(e.itemId)} on ${name(e.toUnitId)}`).join(", ") });
  if (d.repositioned.length) rows.push({ k: "Moved", v: d.repositioned.map((r) => `${name(r.unitId)} (${r.from.row},${r.from.col}) → (${r.to.row},${r.to.col})`).join(", ") });
  if (d.augmentPicked) rows.push({ k: "Augment", v: `${name(d.augmentPicked.chosen)} over ${d.augmentPicked.offered.filter((o) => o !== d.augmentPicked!.chosen).map(name).join(", ") || "unknown options"}` });
  if (d.healthLost) rows.push({ k: "HP lost", v: `${d.healthLost}` });
  return (
    <div className="mt-2">
      {rows.length ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {rows.map((r) => (
            <div key={r.k} className="contents">
              <dt className="text-gold">{r.k}</dt>
              <dd className="text-ink">{r.v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-dim">Nothing changed between these two states.</p>
      )}
      {d.lowConfidence ? (
        <div className="mt-3 border-l-2 border-[var(--red)] pl-3 text-xs text-dim">
          <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-danger">Low confidence</div>
          <ul className="mt-1 list-disc pl-4">
            {(d.notes ?? []).map((n) => (
              <li key={n}>{n}</li>
            ))}
            {d.residual ? <li>Residual: {d.residual} gold unexplained.</li> : null}
          </ul>
        </div>
      ) : null}
      <div className="mt-3">
        <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Evidence</div>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {d.evidence.map((e, i) => (
            <li key={i}>
              <span className={`chip evidence ${(e.confidence ?? 1) < 0.8 ? "evidence-low" : ""}`} title={`${e.field} at ${e.stage}${e.confidence !== undefined ? ` · confidence ${Math.round(e.confidence * 100)}%` : ""}`}>
                <span className="text-gold">{e.stage}</span> {e.field} = {e.value.length > 40 ? `${e.value.slice(0, 37)}…` : e.value}
                {e.confidence !== undefined && e.confidence < 1 ? <span className="text-dim"> {Math.round(e.confidence * 100)}%</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-[0.7rem] text-dim">
        Read the rules behind these fields in the <Link href="/guides/economy#interest-and-the-50-gold-floor">economy guide</Link>.
      </p>
    </div>
  );
}
