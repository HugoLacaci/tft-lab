"use client";

import Link from "next/link";
import { useTrainer } from "@/lib/trainer-store";
import { accuracy, dayStreak, missedIds, rollingAccuracy, weakestCategories } from "@/lib/progress";
import { CATEGORY_BLURBS, CATEGORY_LABELS, SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenario-categories";
import { RANK_TIERS, type Difficulty } from "@/lib/rank-tiers";
import { MODULES, lessonsOf, moduleById } from "@/lib/curriculum";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { Legend, type LegendName } from "@/components/ui/Legend";
import { Placement, StateChip, usePath } from "./PathMap";

export function TrainerHome({ counts, puzzles, lessonIds, totalDrills }: { counts: Record<ScenarioCategory, number>; puzzles: Record<Difficulty, string[]>; lessonIds: Record<string, string[]>; totalDrills: number }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const reset = useTrainer((s) => s.reset);
  const path = usePath(lessonIds);
  const weakest = hydrated ? weakestCategories(progress).slice(0, 3) : [];
  const due = hydrated ? Object.values(progress.srs).filter((e) => e.dueAt <= Date.now()).length : 0;
  const rolling = hydrated ? rollingAccuracy(progress.rolling) : null;
  const streak = hydrated ? dayStreak(progress.activeDays) : 0;
  const missed = hydrated ? missedIds(progress).length : 0;
  const solved = (ids: string[]) => (hydrated ? ids.filter((id) => (progress.seen[id]?.correct ?? 0) > 0).length : 0);
  const totalPuzzles = Object.values(puzzles).reduce((a, b) => a + b.length, 0);
  const next = path.next;
  const nextModule = next ? moduleById(next.module) : null;
  const isNew = hydrated && Object.keys(progress.seen).length === 0;

  return (
    <div className="space-y-8">
      {/* The path: where you are, what comes next */}
      <Panel as="section" className="rise" glow={nextModule?.color ?? "rgba(10, 200, 185, 0.5)"} aria-label="Learning path">
        <div className="flex flex-wrap items-start gap-6">
          <Legend name={(nextModule?.legend as LegendName) ?? "pengu-1"} size={84} tint={nextModule?.color} glow={nextModule ? `color-mix(in srgb, ${nextModule.color} 45%, transparent)` : undefined} />
          <div className="min-w-[16rem] flex-1">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Learning path</div>
            <h2 className="mt-1 flex items-center gap-2 text-xl">
              <Glyph name="path" size={20} className="text-teal" />
              {isNew ? "From your first game to Master-level decisions" : next ? `Next: ${next.title}` : "Path complete"}
            </h2>
            <p className="mt-1 text-sm text-dim">
              {isNew
                ? `${path.total} lessons in five modules, each building on the last: what the game is, then the habits that climb, then the reads and the marginal calls. Pass a lesson to open the next one, or place yourself at your rank and skip ahead.`
                : next && nextModule
                  ? `${nextModule.title} · lesson ${next.order}. ${next.blurb}`
                  : "Every lesson passed. Keep the Daily 10 and the puzzle ladder in your routine, and replay what you miss."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {next ? (
                <Link href={`/trainer/path/${next.id}`} className="btn btn-primary">
                  {isNew ? "Start the path" : "Continue"}
                </Link>
              ) : null}
              <Link href="/trainer/path" className="btn">
                See the whole path
              </Link>
              <Link href="/trainer/welcome" className="btn btn-sm">
                New to TFT? Start here
              </Link>
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[16rem]">
            <div className="flex items-baseline justify-between text-xs text-dim">
              <span className="uppercase tracking-wider">Lessons passed</span>
              <span>
                <span className="display text-base text-gold-bright">{hydrated ? path.passedCount : 0}</span>/{path.total}
              </span>
            </div>
            <div className="path-steps mt-2" aria-hidden>
              {MODULES.map((m) => {
                const ls = lessonsOf(m.id).filter((l) => (lessonIds[l.id]?.length ?? 0) > 0);
                const p = ls.filter((l) => ["passed", "complete"].includes(path.state.get(l.id)?.state ?? "")).length;
                return (
                  <span key={m.id} className="path-step" title={`${m.title}: ${p}/${ls.length}`} style={{ ["--w" as string]: `${ls.length ? (p / ls.length) * 100 : 0}%`, ["--c" as string]: m.color } as React.CSSProperties}>
                    <span />
                  </span>
                );
              })}
            </div>
            <ul className="mt-2 grid grid-cols-5 gap-1 text-center text-[0.6rem] uppercase tracking-wider text-dim">
              {MODULES.map((m) => (
                <li key={m.id} style={{ color: m.color }} className="truncate">
                  {m.index === 0 ? "Welcome" : m.title.split(" ")[0]}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Placement compact />
            </div>
          </div>
        </div>
      </Panel>

      {/* Three ways to train today */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="rise flex flex-col" style={{ ["--i" as string]: 1 } as React.CSSProperties} glow="rgba(10, 200, 185, 0.5)">
          <h2 className="flex items-center gap-2 text-lg">
            <Glyph name="daily" size={18} className="text-teal" />
            Daily 10
          </h2>
          <p className="mt-1 flex-1 text-sm text-dim">
            Anything due for review first, then drills weighted toward your weakest categories{weakest.length ? ` (${weakest.map((c) => CATEGORY_LABELS[c]).join(", ")})` : ""}.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-dim">
            <Stat label="Due" value={String(due)} />
            <Stat label="Rolling 20" value={rolling === null ? "—" : `${Math.round(rolling * 100)}%`} />
            <Stat label="Day streak" value={String(streak)} />
          </div>
          <Link href="/trainer/daily" className="btn btn-primary mt-4 self-start">
            Start Daily 10
          </Link>
        </Panel>

        <Panel className="rise flex flex-col" style={{ ["--i" as string]: 2 } as React.CSSProperties} glow="rgba(224, 72, 58, 0.45)">
          <h2 className="flex items-center gap-2 text-lg">
            <Glyph name="replay" size={18} className="text-danger" />
            Replay what you missed
          </h2>
          <p className="mt-1 flex-1 text-sm text-dim">Every drill whose last attempt was wrong, most recent first. Get it right once and it leaves the list; it still comes back on the spaced schedule.</p>
          <div className="mt-3 text-xs text-dim">
            <Stat label="To replay" value={String(missed)} />
          </div>
          <Link href="/trainer/missed" className={`btn mt-4 self-start ${missed ? "btn-primary" : ""}`} aria-disabled={!missed}>
            {missed ? `Replay ${missed}` : "Nothing to replay"}
          </Link>
        </Panel>

        <Panel className="rise flex flex-col" style={{ ["--i" as string]: 3 } as React.CSSProperties} glow="rgba(198, 140, 255, 0.5)">
          <h2 className="flex items-center gap-2 text-lg">
            <Glyph name="spark" size={18} className="text-gold" />
            Drills made for you
          </h2>
          <p className="mt-1 flex-1 text-sm text-dim">New drills written by an AI coach for your exact weak spots, on the live set, checked against the same rules as every other drill. Bring your own API key.</p>
          <Link href="/trainer/ai" className="btn mt-4 self-start">
            Generate drills
          </Link>
        </Panel>
      </div>

      {/* Modules at a glance */}
      <section aria-label="Modules">
        <div className="display mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold">The path, module by module</div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MODULES.map((m, i) => {
            const ls = lessonsOf(m.id).filter((l) => (lessonIds[l.id]?.length ?? 0) > 0);
            const p = ls.filter((l) => ["passed", "complete"].includes(path.state.get(l.id)?.state ?? "")).length;
            const first = ls[0];
            const st = first ? path.state.get(first.id) : undefined;
            return (
              <li key={m.id} className="rise" style={{ ["--i" as string]: 4 + i } as React.CSSProperties}>
                <Link href={`/trainer/path#${m.id}`} className="panel flex h-full flex-col gap-2 p-3 hover:no-underline" style={{ borderColor: `color-mix(in srgb, ${m.color} 40%, transparent)` }}>
                  <div className="flex items-center gap-2">
                    <Legend name={m.legend as LegendName} size={36} tint={m.color} float={false} />
                    <div className="min-w-0">
                      <div className="display text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: m.color }}>
                        {m.kicker}
                      </div>
                      <div className="display text-sm text-gold-bright">{m.title}</div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-[0.7rem] text-dim">
                    <span>
                      {p}/{ls.length} lessons
                    </span>
                    {st ? <StateChip st={st} /> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <Panel as="section" className="rise" style={{ ["--i" as string]: 6 } as React.CSSProperties} glow="rgba(198, 140, 255, 0.55)" aria-label="Tactics puzzles">
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-[16rem] flex-1">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Chess puzzles, but TFT</div>
            <h2 className="mt-1 flex items-center gap-2 text-xl">
              <Glyph name="puzzle" size={20} className="text-gold" />
              Tactics puzzles
            </h2>
            <p className="mt-1 text-sm text-dim">
              One board, one best move. Positioning, scouting and item puzzles with real champions of the live set and generic archetypes, graded by rank from Iron to Master+. Start at your rank and climb.
            </p>
            <Link href="/trainer/puzzles" className="btn btn-primary mt-4">
              Open the ladder
            </Link>
          </div>
          <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[28rem] lg:flex-1">
            {RANK_TIERS.map((t, i) => {
              const ids = puzzles[t.level] ?? [];
              const done = solved(ids);
              return (
                <li key={t.id} className="rise" style={{ ["--i" as string]: 7 + i } as React.CSSProperties}>
                  <Link href={`/trainer/puzzles/${t.id}`} className="panel flex flex-col items-center gap-1 p-3 text-center hover:no-underline" style={{ borderColor: `color-mix(in srgb, ${t.color} 45%, transparent)` }}>
                    <RankEmblem tier={t} size={44} />
                    <span className="display text-[0.7rem] uppercase tracking-wider" style={{ color: t.color }}>
                      {t.short}
                    </span>
                    <span className="text-[0.7rem] text-dim">
                      {done}/{ids.length} solved
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mt-3 text-[0.7rem] text-dim">{totalPuzzles} puzzles on the ladder. They also show up in the lessons, the category drills and the Daily 10.</p>
      </Panel>

      <div>
        <div className="display mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold">Drills by category · {totalDrills} in total</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIO_CATEGORIES.map((c, i) => {
            const acc = hydrated ? accuracy(progress.perCategory[c]) : null;
            return (
              <Link key={c} href={`/trainer/${c}`} className="panel rise flex gap-4 p-4 hover:no-underline" style={{ ["--i" as string]: 8 + i } as React.CSSProperties}>
                <Ring value={acc} />
                <div className="min-w-0">
                  <div className="display flex items-center gap-2 text-base text-gold-bright">
                    <Glyph name={c} size={18} className="text-gold" />
                    {CATEGORY_LABELS[c]}
                  </div>
                  <p className="mt-1 text-xs text-dim">{CATEGORY_BLURBS[c]}</p>
                  <div className="mt-2 text-[0.7rem] text-dim">
                    {counts[c]} drills · {hydrated ? `${progress.perCategory[c].correct}/${progress.perCategory[c].attempts} correct` : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-dim">
        Progress is stored in this browser only.{" "}
        <button type="button" className="underline" onClick={() => { if (confirm("Reset all trainer progress?")) reset(); }}>
          Reset progress
        </button>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="display text-lg text-gold-bright">{value}</div>
      <div className="uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function Ring({ value, size = 56 }: { value: number | null; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  const color = value === null ? "var(--text-dim)" : v >= 0.8 ? "var(--teal)" : v >= 0.6 ? "var(--gold)" : "var(--red)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={value === null ? "No attempts yet" : `${Math.round(v * 100)}% accuracy`} className="ring-anim shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-raised)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={`${c * v} ${c}`} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fill="var(--gold-bright)" fontSize={size * 0.24} fontFamily="var(--font-display)">
        {value === null ? "—" : `${Math.round(v * 100)}`}
      </text>
    </svg>
  );
}
