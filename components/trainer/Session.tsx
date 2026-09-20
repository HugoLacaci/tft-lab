"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HexCoord } from "@/lib/hex";
import { grade, type Answer, type Grade } from "@/lib/grading";
import type { Scenario } from "@/lib/scenario-schema";
import { CATEGORY_LABELS } from "@/lib/scenario-categories";
import { useTrainer } from "@/lib/trainer-store";
import type { Rendered, SessionData } from "@/lib/trainer-props";
import { drawDaily, seedFromString } from "@/lib/daily";
import { isoDay, rollingAccuracy } from "@/lib/progress";
import { leakWeights, readTracker } from "@/lib/tracker-data";
import { ScenarioBoard } from "./ScenarioBoard";
import { ChoiceQuestion, AugmentQuestion, ItemHolderQuestion, OrderingQuestion, PlacementControls } from "./Questions";
import { Panel } from "@/components/ui/Panel";

export function Session({ data, rendered, mode, title }: { data: SessionData; rendered: Record<string, Rendered>; mode: "category" | "daily"; title: string }) {
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
      const extra = leakWeights(readTracker().games);
      setQueue(drawDaily(data.scenarios, progress, 10, { seed: seedFromString(isoDay() + Object.keys(progress.seen).length), extraWeights: extra }));
    } else {
      // Due cards first, then unseen, then the rest; stable order within groups.
      const due = new Set(Object.values(progress.srs).filter((e) => e.dueAt <= Date.now()).map((e) => e.scenarioId));
      const rank = (s: Scenario) => (due.has(s.id) ? 0 : progress.seen[s.id] ? 2 : 1);
      setQueue([...data.scenarios].sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty));
    }
  }, [queue, hydrated, mode, data.scenarios, progress]);

  const s = queue?.[idx] ?? null;
  const canSubmit = useMemo(() => {
    if (!s || result) return false;
    if (s.question.type === "placement") return !!placed;
    if (s.question.type === "choice") return Array.isArray(answer) && answer.length > 0;
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

  if (!hydrated || !queue) return <p className="text-dim">Loading…</p>;
  if (queue.length === 0) return <p className="text-dim">No scenarios available for this category yet.</p>;

  if (!s) {
    const correct = sessionLog.filter(Boolean).length;
    return (
      <Panel className="text-center">
        <h2 className="text-2xl">Session complete</h2>
        <p className="mt-2 text-dim">
          {correct} of {sessionLog.length} correct. Rolling 20-question accuracy: {pct(rollingAccuracy(progress.rolling))}.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => { setQueue(null); setIdx(0); setSessionLog([]); }}>
            Again
          </button>
          <Link href="/trainer" className="btn">
            Back to categories
          </Link>
        </div>
      </Panel>
    );
  }

  const q = s.question;
  const r = rendered[s.id];
  const highlight = result && q.type === "placement" ? q.correctHexes : result && q.type === "item-holder" ? s.state.board.filter((u) => q.correctUnitIds.includes(u.championId)).map((u) => ({ row: u.row, col: u.col })) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="display uppercase tracking-[0.2em] text-gold">{title}</span>
        <span>
          {idx + 1} / {queue.length}
        </span>
        <span className="chip">{CATEGORY_LABELS[s.category]}</span>
        <span className="chip">{["", "Emerald", "Diamond", "Master+"][s.difficulty]}</span>
        {!s.setAgnostic ? <span className="chip">live set</span> : null}
        <span className="ml-auto">
          Session {sessionLog.filter(Boolean).length}/{sessionLog.length}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="panel p-2 sm:p-4">
          <ScenarioBoard
            scenario={s}
            data={data}
            placementUnit={q.type === "placement" && !result ? q.unitId : null}
            onPlaced={setPlaced}
            highlight={highlight}
            selectedHex={q.type === "item-holder" && typeof answer === "string" ? s.state.board.find((u) => u.championId === answer) ?? null : null}
            onUnitClick={q.type === "item-holder" && !result ? (id) => setAnswer(id) : undefined}
            locked={!!result}
          />
        </div>

        <div className="space-y-4">
          <Panel>
            <p className="text-sm leading-relaxed text-gold-bright">{s.prompt}</p>
            {s.state.lobby?.length ? (
              <div className="mt-3">
                <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Scout</div>
                <ul className="mt-1 space-y-0.5 text-xs text-dim">
                  {s.state.lobby.map((l) => (
                    <li key={l.player}>
                      <span className="text-ink">{l.player}</span> · {l.hp} HP · {l.note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <Panel>
            {q.type === "choice" ? <ChoiceQuestion q={q} value={(answer as string[]) ?? []} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "augment" ? <AugmentQuestion q={q} augments={data.augments} value={answer as string | null} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "item-holder" ? <ItemHolderQuestion q={q} scenario={s} units={data.units} items={data.items} value={answer as string | null} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "ordering" ? <OrderingQuestion q={q} value={(answer as number[]) ?? null} onChange={setAnswer} locked={!!result} /> : null}
            {q.type === "placement" ? <PlacementControls unitName={data.units[q.unitId]?.name ?? q.unitId} placed={placed} locked={!!result} /> : null}

            {!result ? (
              <button type="button" className="btn btn-primary mt-4 w-full justify-center" disabled={!canSubmit} onClick={submit}>
                Submit
              </button>
            ) : null}
          </Panel>

          {result ? (
            <Panel className={`border-l-4 ${result.correct ? "border-l-teal" : "border-l-danger"}`} aria-live="polite">
              <div className="display text-sm uppercase tracking-[0.2em]" style={{ color: result.correct ? "var(--teal)" : "var(--red)" }}>
                {result.correct ? "Correct" : "Not quite"}
                {!result.correct && result.score > 0 ? <span className="ml-2 text-dim">({Math.round(result.score * 100)}%)</span> : null}
              </div>
              {!result.correct ? <p className="mt-1 text-xs text-dim">{result.detail}</p> : null}
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
