"use client";

import Link from "next/link";
import { useTrainer } from "@/lib/trainer-store";
import { MODULES, isUnlocked, lessonProgress, lessonsOf, orderedLessons, type Lesson, type LessonProgress, type Module } from "@/lib/curriculum";
import { CATEGORY_LABELS } from "@/lib/scenario-categories";
import { RANK_TIERS } from "@/lib/rank-tiers";
import { Legend, type LegendName } from "@/components/ui/Legend";
import { Glyph } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";

/** Hook: per-lesson state from the browser's progress. */
export function usePath(lessonIds: Record<string, string[]>) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const ids = (l: Lesson) => lessonIds[l.id] ?? [];
  const passedById = new Map<string, boolean>();
  // Two passes: "passed" for every lesson first, then unlocks that depend on the previous lesson.
  for (const l of orderedLessons()) {
    const p = lessonProgress(ids(l), progress.seen, true);
    passedById.set(l.id, p.state === "passed" || p.state === "complete" || !!progress.lessonsPassed?.[l.id]);
  }
  const state = new Map<string, LessonProgress>();
  for (const l of orderedLessons()) {
    const unlocked = isUnlocked(l.id, { placed: progress.placed, passed: (id) => passedById.get(id) ?? false });
    state.set(l.id, lessonProgress(ids(l), progress.seen, unlocked));
  }
  const live = orderedLessons().filter((l) => ids(l).length > 0);
  const next = live.find((l) => {
    const st = state.get(l.id)!;
    return st.state !== "locked" && st.state !== "passed" && st.state !== "complete";
  }) ?? null;
  const passedCount = live.filter((l) => passedById.get(l.id)).length;
  return { hydrated, progress, state, next, live, passedCount, total: live.length };
}

const TIER_NAMES = ["New to TFT", ...RANK_TIERS.map((t) => t.label)];

/** "Where are you starting from?" — sets the unlock level for the whole path. */
export function Placement({ compact = false }: { compact?: boolean }) {
  const placed = useTrainer((s) => s.progress.placed);
  const hydrated = useTrainer((s) => s.hydrated);
  const setPlaced = useTrainer((s) => s.setPlaced);
  if (!hydrated) return null;
  return (
    <div className={compact ? "" : "panel p-4 sm:p-5"}>
      <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">{placed === undefined ? "Where are you starting from?" : "Starting point"}</div>
      <p className="mt-1 text-xs text-dim">
        {placed === undefined ? "Pick your rank to open the path up to that level. You can change it any time; every lesson stays available below your rank." : "Lessons at or below this level are open. Higher ones open as you pass the ones before them."}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TIER_NAMES.map((name, i) => {
          const tier = i === 0 ? null : RANK_TIERS[i - 1]!;
          const on = placed === i;
          return (
            <button
              key={name}
              type="button"
              className={`chip ${on ? "chip-active" : ""}`}
              aria-pressed={on}
              style={tier && on ? { color: tier.color, borderColor: tier.color } : undefined}
              onClick={() => setPlaced(i)}
            >
              {tier ? <RankEmblem tier={tier} size={13} /> : <Glyph name="spark" size={12} />}
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StateChip({ st }: { st: LessonProgress }) {
  if (st.state === "locked")
    return (
      <span className="chip">
        <Glyph name="lock" size={11} />
        locked
      </span>
    );
  if (st.state === "complete")
    return (
      <span className="chip chip-active" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
        <Glyph name="check" size={11} />
        complete
      </span>
    );
  if (st.state === "passed")
    return (
      <span className="chip" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
        <Glyph name="check" size={11} />
        passed
      </span>
    );
  if (st.state === "started") return <span className="chip chip-active">in progress</span>;
  return <span className="chip">new</span>;
}

export function LessonBar({ st, color = "var(--teal)" }: { st: LessonProgress; color?: string }) {
  const v = st.total ? st.solved / st.total : 0;
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={st.total} aria-valuenow={st.solved} aria-label={`${st.solved} of ${st.total} drills solved`}>
      <span style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

/** The whole path: modules in order, each with its lesson cards. */
export function PathMap({ lessonIds, compact = false, only }: { lessonIds: Record<string, string[]>; compact?: boolean; /** render one module only */ only?: string }) {
  const { hydrated, state, next } = usePath(lessonIds);
  return (
    <div className="space-y-6">
      {MODULES.filter((m) => !only || m.id === only).map((m, mi) => {
        const lessons = lessonsOf(m.id).filter((l) => (lessonIds[l.id]?.length ?? 0) > 0);
        if (!lessons.length) return null;
        const passed = lessons.filter((l) => ["passed", "complete"].includes(state.get(l.id)?.state ?? "")).length;
        const lockedAll = hydrated && lessons.every((l) => state.get(l.id)?.state === "locked");
        return (
          <section key={m.id} id={m.id} className={`panel panel-glow rise p-4 sm:p-5 ${lockedAll ? "module-locked" : ""}`} style={{ ["--panel-glow" as string]: m.color, ["--i" as string]: mi } as React.CSSProperties} aria-label={m.title}>
            <span className="panel-glow-line" aria-hidden />
            <ModuleHeader m={m} passed={passed} total={lessons.length} index={mi} />
            <ol className={`mt-4 grid gap-2 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
              {lessons.map((l) => {
                const st = state.get(l.id) ?? { state: "new" as const, solved: 0, tried: 0, total: lessonIds[l.id]?.length ?? 0 };
                const isNext = next?.id === l.id;
                return (
                  <li key={l.id}>
                    <LessonCard lesson={l} st={st} isNext={isNext} color={m.color} compact={compact} />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

export function ModuleHeader({ m, passed, total, index }: { m: Module; passed: number; total: number; index: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Legend name={m.legend as LegendName} size={56} tint={m.color} glow={`color-mix(in srgb, ${m.color} 45%, transparent)`} delay={index * 0.6} />
      <div className="min-w-[14rem] flex-1">
        <div className="display text-[0.65rem] uppercase tracking-[0.2em]" style={{ color: m.color }}>
          {index === 0 ? "Start here" : `Module ${index}`} · {m.kicker}
        </div>
        <h2 className="text-xl">{m.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-dim">{m.blurb}</p>
      </div>
      <div className="text-right text-xs text-dim">
        <span className="display text-base text-gold-bright">{passed}</span>/{total} lessons passed
      </div>
    </div>
  );
}

function LessonCard({ lesson, st, isNext, color, compact }: { lesson: Lesson; st: LessonProgress; isNext: boolean; color: string; compact: boolean }) {
  const locked = st.state === "locked";
  return (
    <Link href={`/trainer/path/${lesson.id}`} className={`lesson-card panel flex h-full flex-col gap-2 p-3 hover:no-underline ${locked ? "lesson-locked" : ""} ${isNext ? "lesson-next" : ""}`} style={isNext ? ({ borderColor: color } as React.CSSProperties) : undefined} aria-label={`${lesson.title}: ${st.state}`}>
      <div className="flex items-start gap-2">
        <span className="display mt-0.5 w-6 shrink-0 text-xs text-gold">{lesson.order}</span>
        <div className="min-w-0 flex-1">
          <div className="display text-sm leading-snug text-gold-bright">{lesson.title}</div>
          {!compact ? <p className="mt-1 text-xs text-dim">{lesson.blurb}</p> : null}
        </div>
        <StateChip st={st} />
      </div>
      <div className="mt-auto flex items-center gap-2 text-[0.7rem] text-dim">
        <Glyph name={lesson.category} size={12} />
        {CATEGORY_LABELS[lesson.category]}
        <span className="ml-auto">
          {st.solved}/{st.total}
        </span>
      </div>
      <LessonBar st={st} color={color} />
      {isNext ? (
        <div className="display text-[0.65rem] uppercase tracking-[0.2em]" style={{ color }}>
          Continue here →
        </div>
      ) : null}
    </Link>
  );
}
