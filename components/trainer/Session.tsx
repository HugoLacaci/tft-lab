"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HexCoord } from "@/lib/hex";
import { grade, type Answer, type Grade } from "@/lib/grading";
import type { Scenario } from "@/lib/scenario-schema";
import { CATEGORY_LABELS } from "@/lib/scenario-categories";
import { tierByLevel } from "@/lib/rank-tiers";
import { useTrainer } from "@/lib/trainer-store";
import type { Rendered, SessionData } from "@/lib/trainer-props";
import { drawDaily, seedFromString } from "@/lib/daily";
import { isoDay, rollingAccuracy } from "@/lib/progress";
import { leakWeights, readTracker } from "@/lib/tracker-data";
import { mergeWeights, readFocus } from "@/lib/focus";
import { ScenarioBoard } from "./ScenarioBoard";
import { ChoiceQuestion, AugmentQuestion, ItemHolderQuestion, OrderingQuestion, PlacementControls, SwapControls } from "./Questions";
import { Panel } from "@/components/ui/Panel";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { Legend } from "@/components/ui/Legend";
import { Glyph } from "@/components/ui/Glyphs";
import { StatIcon } from "@/components/set/StatIcon";

export type SessionMode = "category" | "daily" | "puzzles";

export function Session({ data, rendered, mode, title }: { data: SessionData; rendered: Record<string, Rendered>; mode: SessionMode; title: string }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const record = useTrainer((s) => s.record);

  const [queue, setQueue] = useState<Scenario[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [placed, setPlaced] = useState<HexCoord | null>(null);
  const [result, setResult] = useState<Grade | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [sessionLog, setSessionLog] = useState<boolean[]>([]);

  useEffect(() => {
    if (queue || !hydrated) return;
    if (mode === "daily") {
      const extra = mergeWeights(leakWeights(readTracker().games), readFocus()?.weights);
      setQueue(drawDaily(data.scenarios, progress, 10, { seed: seedFromString(isoDay() + Object.keys(progress.seen).length), extraWeights: extra }));
      return;
    }
    if (mode === "puzzles") {
      // Ladder order (file order within the tier); a #<id> hash starts the session at that puzzle.
      const ordered = [...data.scenarios].sort((a, b) => a.difficulty - b.difficulty);
      const start = typeof window !== "undefined" ? decodeURIComponent(window.location.hash.slice(1)) : "";
      const at = start ? ordered.findIndex((s) => s.id === start) : -1;
      setQueue(at > 0 ? [...ordered.slice(at), ...ordered.slice(0, at)] : ordered);
      return;
    }
    // Due cards first, then unseen, then the rest; stable order within groups.
    const due = new Set(Object.values(progress.srs).filter((e) => e.dueAt <= Date.now()).map((e) => e.scenarioId));
    const rank = (s: Scenario) => (due.has(s.id) ? 0 : progress.seen[s.id] ? 2 : 1);
    setQueue([...data.scenarios].sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty));
  }, [queue, hydrated, mode, data.scenarios, progress]);

  const s = queue?.[idx] ?? null;
  const canSubmit = useMemo(() => {
    if (!s || result) return false;
    if (s.question.type === "placement") return !!placed;
    if (s.question.type === "choice") return Array.isArray(answer) && answer.length > 0;
    if (s.question.type === "swap") return Array.isArray(answer) && answer.length === 2;
    if (s.question.type === "ordering") return Array.isArray(answer) && answer.length === s.question.steps.length;
    return answer !== null;
  }, [s, answer, placed, result]);

  const submit = () => {
    if (!s || !canSubmit) return;
    const a: Answer = s.question.type === "placement" ? placed! : answer!;
    const g = grade(s.question, a);
    setResult(g);
    record(s.id, s.category, g.correct);
    setSessionLog((l) => [...l, g.correct]);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setAnswer(null);
    setPlaced(null);
    setResult(null);
    setShowMore(false);
  };

  const backHref = mode === "puzzles" ? "/trainer/puzzles" : "/trainer";
  const backLabel = mode === "puzzles" ? "Back to the ladder" : "Back to categories";

  if (!hydrated || !queue) return <p className="text-dim">Loading…</p>;
  if (queue.length === 0) return <p className="text-dim">No scenarios available here yet.</p>;

  if (!s) {
    const correct = sessionLog.filter(Boolean).length;
    const ratio = sessionLog.length ? correct / sessionLog.length : 0;
    return (
      <Panel className="pop text-center">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
          <Legend name={ratio >= 0.8 ? "choncc-3" : ratio >= 0.5 ? "choncc-2" : "choncc-1"} size={110} glow={ratio >= 0.8 ? "rgba(10,200,185,0.45)" : undefined} title="Choncc" />
          <div>
            <h2 className="text-2xl">{ratio >= 0.8 ? "Clean session" : ratio >= 0.5 ? "Session complete" : "Session complete, work to do"}</h2>
            <p className="mt-2 text-dim">
              {correct} of {sessionLog.length} correct. Rolling 20-question accuracy: {pct(rollingAccuracy(progress.rolling))}.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button type="button" className="btn btn-primary" onClick={() => { setQueue(null); setIdx(0); setSessionLog([]); }}>
                Again
              </button>
              <Link href={backHref} className="btn">
                {backLabel}
              </Link>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  const q = s.question;
  const r = rendered[s.id];
  const tier = tierByLevel(s.difficulty);
  const picked = q.type === "swap" && Array.isArray(answer) ? (answer as string[]) : [];
  const selected =
    q.type === "item-holder" && typeof answer === "string"
      ? s.state.board.filter((u) => u.championId === answer)
      : q.type === "swap"
        ? s.state.board.filter((u) => picked.includes(u.championId))
        : [];
  const highlight =
    result && q.type === "placement"
      ? q.correctHexes
      : result && q.type === "item-holder"
        ? s.state.board.filter((u) => q.correctUnitIds.includes(u.championId)).map((u) => ({ row: u.row, col: u.col }))
        : result && q.type === "swap"
          ? s.state.board.filter((u) => q.correctPairs[0]!.includes(u.championId)).map((u) => ({ row: u.row, col: u.col }))
          : [];

  const onUnitClick =
    result
      ? undefined
      : q.type === "item-holder"
        ? (id: string) => setAnswer(id)
        : q.type === "swap"
          ? (id: string) => setAnswer(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked.slice(-1), id])
          : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="display uppercase tracking-[0.2em] text-gold">{title}</span>
        <span>
          {idx + 1} / {queue.length}
        </span>
        <span className="chip">
          <Glyph name={s.category} size={13} />
          {CATEGORY_LABELS[s.category]}
        </span>
        <span className="chip" style={{ color: tier.color, borderColor: tier.color }} title={`Written for ${tier.label}`}>
          <RankEmblem tier={tier} size={14} />
          {tier.short}
        </span>
        {s.kind === "puzzle" ? (
          <span className="chip">
            <Glyph name="puzzle" size={13} />
            puzzle
          </span>
        ) : null}
        {!s.setAgnostic ? <span className="chip">live set</span> : null}
        <span className="ml-auto">
          Session {sessionLog.filter(Boolean).length}/{sessionLog.length}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="panel p-2 sm:p-4">
          <ScenarioBoard
            key={s.id}
            scenario={s}
            data={data}
            placementUnit={q.type === "placement" ? q.unitId : null}
            onPlaced={setPlaced}
            highlight={highlight}
            selected={selected}
            onUnitClick={onUnitClick}
            locked={!!result}
          />
        </div>

        <div className="space-y-4">
          <Panel className="rise">
            {s.kind === "puzzle" && s.title ? <h2 className="mb-1 text-base">{s.title}</h2> : null}
            <p className="text-sm leading-relaxed text-gold-bright">{s.prompt}</p>
            {s.state.lobby?.length ? (
              <div className="mt-3">
                <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Scout</div>
                <ul className="mt-1 space-y-0.5 text-xs text-dim">
                  {s.state.lobby.map((l) => (
                    <li key={l.player}>
                      <span className="text-ink">{l.player}</span> · {l.hp} <StatIcon stat="HP" title="Player health" /> · {l.note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <Panel className="rise" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
            {q.type === "choice" ? <ChoiceQuestion q={q} value={(answer as string[]) ?? []} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "augment" ? <AugmentQuestion q={q} augments={data.augments} value={answer as string | null} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "item-holder" ? <ItemHolderQuestion q={q} scenario={s} units={data.units} items={data.items} value={answer as string | null} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "ordering" ? <OrderingQuestion q={q} value={(answer as number[]) ?? null} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "placement" ? <PlacementControls unitName={data.units[q.unitId]?.name ?? q.unitId} placed={placed} locked={!!result} /> : null}
            {q.type === "swap" ? <SwapControls scenario={s} units={data.units} picked={picked} onChange={(v) => setAnswer(v)} locked={!!result} /> : null}

            {!result ? (
              <button type="button" className="btn btn-primary mt-4 w-full justify-center" disabled={!canSubmit} onClick={submit}>
                Submit
              </button>
            ) : null}
          </Panel>

          {result ? (
            <Panel className={`pop border-l-4 ${result.correct ? "border-l-teal flash-ok" : "border-l-danger flash-bad"}`} aria-live="polite">
              <div className="flex items-start gap-3">
                <Legend name={result.correct ? "choncc-2" : "pengu-1"} size={44} float={false} glow={result.correct ? "rgba(10,200,185,0.5)" : "rgba(224,72,58,0.4)"} tint={result.correct ? "#0ac8b9" : "#e0483a"} />
                <div className="min-w-0 flex-1">
                  <div className="display text-sm uppercase tracking-[0.2em]" style={{ color: result.correct ? "var(--teal)" : "var(--red)" }}>
                    {result.correct ? "Correct" : "Not quite"}
                    {!result.correct && result.score > 0 ? <span className="ml-2 text-dim">({Math.round(result.score * 100)}%)</span> : null}
                  </div>
                  {!result.correct ? <p className="mt-1 text-xs text-dim">{result.detail}</p> : null}
                </div>
              </div>
              <div className="prose-tft mt-3 text-sm">{r?.explanation}</div>
              <div className="mt-4 border-t border-[var(--gold-dim)] pt-3">
                <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Principle</div>
                <p className="mt-1 text-sm text-gold-bright">{s.principle}</p>
                <Link href={s.guideLink} className="mt-1 inline-block text-xs">
                  Read the guide section →
                </Link>
              </div>
              {s.commonMistake ? (
                <div className="mt-3 border-t border-[var(--gold-dim)] pt-3">
                  <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-danger">Common mistake</div>
                  <p className="mt-1 text-sm text-dim">{s.commonMistake}</p>
                </div>
              ) : null}
              {r?.explainMore ? (
                <div className="mt-3">
                  <button type="button" className="btn btn-sm" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
                    {showMore ? "Hide" : "Explain more"}
                  </button>
                  {showMore ? <div className="prose-tft mt-3 border-l border-[var(--gold-dim)] pl-3 text-sm">{r.explainMore}</div> : null}
                </div>
              ) : null}
              <button type="button" className="btn btn-primary mt-4 w-full justify-center" onClick={next} autoFocus>
                Next
              </button>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}
