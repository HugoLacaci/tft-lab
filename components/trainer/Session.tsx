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
import { isoDay, missedIds, rollingAccuracy } from "@/lib/progress";
import { leakWeights, readTracker } from "@/lib/tracker-data";
import { mergeWeights, readFocus } from "@/lib/focus";
import { hasBoardSolution, solutionFor } from "@/lib/solution";
import { lessonProgress, type Lesson } from "@/lib/curriculum";
import { ScenarioBoard } from "./ScenarioBoard";
import { MiniBoard } from "./MiniBoard";
import { ChoiceQuestion, AugmentQuestion, ItemHolderQuestion, OrderingQuestion, PlacementControls, SwapControls } from "./Questions";
import { Panel } from "@/components/ui/Panel";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { Legend } from "@/components/ui/Legend";
import { Glyph } from "@/components/ui/Glyphs";
import { StatIcon } from "@/components/set/StatIcon";

export type SessionMode = "category" | "daily" | "puzzles" | "lesson" | "missed" | "ai";

export interface SessionProps {
  data: SessionData;
  /** Pre-rendered explanations; drills without one (AI drills) render their markdown as plain paragraphs. */
  rendered?: Record<string, Rendered>;
  mode: SessionMode;
  title: string;
  /** Lesson mode: the lesson being played and what comes after it. */
  lesson?: Lesson;
  nextLesson?: { id: string; title: string } | null;
  backHref?: string;
  backLabel?: string;
}

export function Session({ data, rendered = {}, mode, title, lesson, nextLesson, backHref, backLabel }: SessionProps) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const record = useTrainer((s) => s.record);
  const markLessonPassed = useTrainer((s) => s.markLessonPassed);

  const [queue, setQueue] = useState<Scenario[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [placed, setPlaced] = useState<HexCoord | null>(null);
  const [result, setResult] = useState<Grade | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [sessionLog, setSessionLog] = useState<{ id: string; correct: boolean }[]>([]);

  useEffect(() => {
    if (queue || !hydrated) return;
    // Players who placed themselves at Gold or above do not get the Welcome-module drills in mixed sessions.
    const pool = (progress.placed ?? 1) >= 2 ? data.scenarios.filter((x) => !x.lesson?.startsWith("welcome-")) : data.scenarios;
    if (mode === "daily") {
      const extra = mergeWeights(leakWeights(readTracker().games), readFocus()?.weights);
      setQueue(drawDaily(pool.length ? pool : data.scenarios, progress, 10, { seed: seedFromString(isoDay() + Object.keys(progress.seen).length), extraWeights: extra }));
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
    if (mode === "missed") {
      const order = missedIds(progress);
      const rank = new Map(order.map((id, i) => [id, i]));
      setQueue(data.scenarios.filter((s) => rank.has(s.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!));
      return;
    }
    if (mode === "lesson") {
      // Lesson order, but drills never solved yet come first so a replay goes straight to the gaps.
      const solved = (s: Scenario) => ((progress.seen[s.id]?.correct ?? 0) > 0 ? 1 : 0);
      setQueue([...data.scenarios].sort((a, b) => solved(a) - solved(b)));
      return;
    }
    if (mode === "ai") {
      setQueue([...data.scenarios]);
      return;
    }
    // Due cards first, then unseen, then the rest; stable order within groups.
    const due = new Set(Object.values(progress.srs).filter((e) => e.dueAt <= Date.now()).map((e) => e.scenarioId));
    const rank = (s: Scenario) => (due.has(s.id) ? 0 : progress.seen[s.id] ? 2 : 1);
    setQueue([...(pool.length ? pool : data.scenarios)].sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty));
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
    record(s.id, s.category, g.correct, { hinted: hintOpen });
    setSessionLog((l) => [...l, { id: s.id, correct: g.correct }]);
    // A wrong board answer opens the drawn solution straight away; text answers are already marked in the question.
    setShowMore(!g.correct && hasBoardSolution(s));
  };

  const next = () => {
    setIdx((i) => i + 1);
    setAnswer(null);
    setPlaced(null);
    setResult(null);
    setShowMore(false);
    setHintOpen(false);
  };

  const restart = (ids?: string[]) => {
    if (ids?.length) {
      const pick = new Set(ids);
      setQueue(data.scenarios.filter((x) => pick.has(x.id)));
    } else setQueue(null);
    setIdx(0);
    setSessionLog([]);
    setAnswer(null);
    setPlaced(null);
    setResult(null);
    setShowMore(false);
    setHintOpen(false);
  };

  const back = backHref ?? (mode === "puzzles" ? "/trainer/puzzles" : mode === "lesson" ? "/trainer/path" : "/trainer");
  const backText = backLabel ?? (mode === "puzzles" ? "Back to the ladder" : mode === "lesson" ? "Back to the path" : "Back to the trainer");

  // Lesson pass detection runs off the persisted progress so it survives reloads.
  const lessonIds = useMemo(() => (mode === "lesson" ? data.scenarios.map((x) => x.id) : []), [mode, data.scenarios]);
  const lp = mode === "lesson" && hydrated ? lessonProgress(lessonIds, progress.seen, true) : null;
  const lessonPassed = !!lp && (lp.state === "passed" || lp.state === "complete");
  useEffect(() => {
    if (lesson && lessonPassed) markLessonPassed(lesson.id);
  }, [lesson, lessonPassed, markLessonPassed]);

  if (!hydrated || !queue) return <p className="text-dim">Loading…</p>;
  if (queue.length === 0)
    return (
      <Panel className="pop">
        <p className="text-dim">{mode === "missed" ? "Nothing to replay: every drill you have tried, you got right on the last attempt." : "No drills available here yet."}</p>
        <Link href={back} className="btn mt-3">
          {backText}
        </Link>
      </Panel>
    );

  if (!s) {
    const correct = sessionLog.filter((x) => x.correct).length;
    const missed = sessionLog.filter((x) => !x.correct).map((x) => x.id);
    const ratio = sessionLog.length ? correct / sessionLog.length : 0;
    const clean = ratio >= 0.8;
    return (
      <Panel className="pop" glow={clean ? "rgba(10,200,185,0.5)" : undefined}>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
          <Legend name={clean ? "choncc-3" : ratio >= 0.5 ? "choncc-2" : "choncc-1"} size={110} glow={clean ? "rgba(10,200,185,0.45)" : undefined} title="Choncc" />
          <div className="min-w-0 flex-1">
            <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">{title}</div>
            <h2 className="text-2xl">{lesson && lessonPassed ? (lp?.state === "complete" ? "Lesson complete" : "Lesson passed") : clean ? "Clean session" : ratio >= 0.5 ? "Session complete" : "Session complete, work to do"}</h2>
            <p className="mt-2 text-dim">
              {correct} of {sessionLog.length} correct. Rolling 20-question accuracy: {pct(rollingAccuracy(progress.rolling))}.
              {lesson && lp && !lessonPassed ? ` This lesson needs ${Math.ceil(lp.total * 0.7) - lp.solved} more drill${Math.ceil(lp.total * 0.7) - lp.solved === 1 ? "" : "s"} solved to pass (${lp.solved}/${lp.total}).` : ""}
            </p>
            {missed.length ? (
              <p className="mt-2 text-sm text-dim">
                Missed: {missed.map((id) => data.scenarios.find((x) => x.id === id)?.title ?? firstSentence(data.scenarios.find((x) => x.id === id)?.prompt ?? id)).join(" · ")}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {lesson && lessonPassed && nextLesson ? (
                <Link href={`/trainer/path/${nextLesson.id}`} className="btn btn-primary">
                  Next lesson: {nextLesson.title} →
                </Link>
              ) : null}
              {missed.length ? (
                <button type="button" className={`btn ${lesson && lessonPassed ? "" : "btn-primary"}`} onClick={() => restart(missed)}>
                  Retry the {missed.length} missed
                </button>
              ) : null}
              <button type="button" className="btn" onClick={() => restart()}>
                {mode === "daily" ? "Another 10" : "Play again"}
              </button>
              <Link href={back} className="btn">
                {backText}
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

  const name = (id: string) => data.units[id]?.name ?? data.items[id]?.name ?? data.augments[id]?.name ?? id;
  const solution = result ? solutionFor(s, name) : null;
  const boardSolution = solution && hasBoardSolution(s) ? solution : null;
  const hint = s.hint ?? fallbackHint(s);
  const explainAvailable = !!r?.explainMore || !!boardSolution;

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
        {s.id.startsWith("ai-") ? <span className="chip">made for you</span> : !s.setAgnostic ? <span className="chip">live set</span> : null}
        <span className="ml-auto flex items-center gap-2">
          <ProgressDots log={sessionLog} total={queue.length} />
          <span>
            {sessionLog.filter((x) => x.correct).length}/{sessionLog.length}
          </span>
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
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary flex-1 justify-center" disabled={!canSubmit} onClick={submit}>
                    Submit
                  </button>
                  <button type="button" className={`btn ${hintOpen ? "chip-active" : ""}`} aria-expanded={hintOpen} aria-controls="drill-hint" onClick={() => setHintOpen((v) => !v)} title="A nudge, not the answer. Using it is noted in your progress.">
                    <Glyph name="hint" size={14} />
                    Hint
                  </button>
                </div>
                {hintOpen ? (
                  <p id="drill-hint" className="hint-box text-sm text-gold-bright" aria-live="polite">
                    {hint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Panel>

          {result ? (
            <Panel className={`pop border-l-4 ${result.correct ? "border-l-teal flash-ok" : "border-l-danger flash-bad"}`} aria-live="polite">
              <div className="flex items-start gap-3">
                <Legend name={result.correct ? "choncc-2" : "pengu-1"} size={44} float={false} glow={result.correct ? "rgba(10,200,185,0.5)" : "rgba(224,72,58,0.4)"} tint={result.correct ? "#0ac8b9" : "#e0483a"} />
                <div className="min-w-0 flex-1">
                  <div className="display text-sm uppercase tracking-[0.2em]" style={{ color: result.correct ? "var(--teal)" : "var(--red)" }}>
                    {result.correct ? (hintOpen ? "Correct, with a hint" : "Correct") : "Not quite"}
                    {!result.correct && result.score > 0 ? <span className="ml-2 text-dim">({Math.round(result.score * 100)}%)</span> : null}
                  </div>
                  {!result.correct ? <p className="mt-1 text-xs text-dim">{result.detail}</p> : null}
                  {!result.correct && solution?.text && !boardSolution ? <p className="mt-1 whitespace-pre-line text-xs text-gold-bright">Answer: {solution.text}</p> : null}
                </div>
              </div>
              <div className="prose-tft mt-3 text-sm">{r?.explanation ?? <PlainMarkdown text={s.explanation} />}</div>
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
              {explainAvailable ? (
                <div className="mt-3">
                  <button type="button" className="btn btn-sm" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
                    {showMore ? "Hide" : boardSolution ? "Show the solution" : "Explain more"}
                  </button>
                  {showMore ? (
                    <div className="mt-3 space-y-3">
                      {boardSolution ? (
                        <figure className="solution">
                          <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-teal">Solution</div>
                          <div className="mt-2 flex justify-center overflow-x-auto">
                            <MiniBoard board={boardSolution.board} enemyBoard={s.state.enemyBoard} units={data.units} hex={s.state.enemyBoard?.length ? 17 : 22} marks={boardSolution.marks} />
                          </div>
                          <figcaption className="mt-2 text-center text-xs text-dim">{boardSolution.caption}</figcaption>
                        </figure>
                      ) : null}
                      {r?.explainMore ? <div className="prose-tft border-l border-[var(--gold-dim)] pl-3 text-sm">{r.explainMore}</div> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button type="button" className="btn btn-primary mt-4 w-full justify-center" onClick={next} autoFocus>
                {idx + 1 < queue.length ? "Next" : "Finish"}
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

function firstSentence(s: string): string {
  const f = s.split(/(?<=[.!?])\s/)[0] ?? s;
  return f.length > 60 ? `${f.slice(0, 57).trimEnd()}…` : f;
}

/** Drills written before hints existed: point at the guide section instead of the answer. */
function fallbackHint(s: Scenario): string {
  const anchor = s.guideLink.split("#")[1]?.replace(/-/g, " ");
  return anchor ? `Think about "${anchor}". What does that rule say about this board?` : "Look at the board again: who gets hit first, what the gold buys, what the lobby is doing.";
}

/** Markdown-ish paragraphs for drills that were not pre-rendered (AI drills). */
function PlainMarkdown({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p.replace(/\*\*([^*]+)\*\*/g, "$1")}</p>
        ))}
    </>
  );
}

function ProgressDots({ log, total }: { log: { correct: boolean }[]; total: number }) {
  const n = Math.min(total, 30);
  return (
    <span className="hidden items-center gap-0.5 sm:inline-flex" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const e = log[i];
        return <span key={i} className="inline-block h-1.5 w-1.5 rotate-45" style={{ background: e ? (e.correct ? "var(--teal)" : "var(--red)") : "var(--gold-dim)" }} />;
      })}
      {total > n ? <span className="ml-1">+{total - n}</span> : null}
    </span>
  );
}
