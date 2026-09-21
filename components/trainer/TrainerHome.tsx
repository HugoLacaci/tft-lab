"use client";

import Link from "next/link";
import { useTrainer } from "@/lib/trainer-store";
import { accuracy, dayStreak, rollingAccuracy, weakestCategories } from "@/lib/progress";
import { CATEGORY_BLURBS, CATEGORY_LABELS, SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenario-categories";
import { RANK_TIERS, type Difficulty } from "@/lib/rank-tiers";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { Legend } from "@/components/ui/Legend";

export function TrainerHome({ counts, puzzles }: { counts: Record<ScenarioCategory, number>; puzzles: Record<Difficulty, string[]> }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const reset = useTrainer((s) => s.reset);
  const weakest = hydrated ? weakestCategories(progress).slice(0, 3) : [];
  const due = hydrated ? Object.values(progress.srs).filter((e) => e.dueAt <= Date.now()).length : 0;
  const rolling = hydrated ? rollingAccuracy(progress.rolling) : null;
  const streak = hydrated ? dayStreak(progress.activeDays) : 0;
  const solved = (ids: string[]) => (hydrated ? ids.filter((id) => (progress.seen[id]?.correct ?? 0) > 0).length : 0);
  const totalPuzzles = Object.values(puzzles).reduce((a, b) => a + b.length, 0);

  return (
    <div className="space-y-8">
      <Panel className="rise flex flex-wrap items-center gap-6" glow="rgba(10, 200, 185, 0.5)">
        <Legend name="pengu-2" size={72} glow="rgba(10,200,185,0.35)" tint="#0ac8b9" />
        <div className="min-w-[14rem] flex-1">
          <h2 className="flex items-center gap-2 text-xl">
            <Glyph name="daily" size={20} className="text-teal" />
            Daily 10
          </h2>
          <p className="mt-1 text-sm text-dim">
            Ten mixed drills: anything due for review first, then weighted toward your weakest categories
            {weakest.length ? ` (${weakest.map((c) => CATEGORY_LABELS[c]).join(", ")})` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-center text-xs text-dim">
          <Stat label="Due" value={String(due)} />
          <Stat label="Rolling 20" value={rolling === null ? "—" : `${Math.round(rolling * 100)}%`} />
          <Stat label="Day streak" value={String(streak)} />
        </div>
        <Link href="/trainer/daily" className="btn btn-primary">
          Start Daily 10
        </Link>
      </Panel>

      <Panel as="section" className="rise" style={{ ["--i" as string]: 1 } as React.CSSProperties} glow="rgba(198, 140, 255, 0.55)" aria-label="Tactics puzzles">
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
          <ul className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[28rem]">
            {RANK_TIERS.map((t, i) => {
              const ids = puzzles[t.level] ?? [];
              const done = solved(ids);
              return (
                <li key={t.id} className="rise" style={{ ["--i" as string]: 2 + i } as React.CSSProperties}>
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
        <p className="mt-3 text-[0.7rem] text-dim">{totalPuzzles} puzzles on the ladder. They also show up in the category drills and the Daily 10.</p>
      </Panel>

      <div>
        <div className="display mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold">Drills by category</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIO_CATEGORIES.map((c, i) => {
            const acc = hydrated ? accuracy(progress.perCategory[c]) : null;
            return (
              <Link key={c} href={`/trainer/${c}`} className="panel rise flex gap-4 p-4 hover:no-underline" style={{ ["--i" as string]: 2 + i } as React.CSSProperties}>
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
