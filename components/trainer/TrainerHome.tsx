"use client";

import Link from "next/link";
import { useTrainer } from "@/lib/trainer-store";
import { accuracy, dayStreak, rollingAccuracy, weakestCategories } from "@/lib/progress";
import { CATEGORY_BLURBS, CATEGORY_LABELS, SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenario-categories";
import { Panel } from "@/components/ui/Panel";

export function TrainerHome({ counts }: { counts: Record<ScenarioCategory, number> }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const reset = useTrainer((s) => s.reset);
  const weakest = hydrated ? weakestCategories(progress).slice(0, 3) : [];
  const due = hydrated ? Object.values(progress.srs).filter((e) => e.dueAt <= Date.now()).length : 0;
  const rolling = hydrated ? rollingAccuracy(progress.rolling) : null;
  const streak = hydrated ? dayStreak(progress.activeDays) : 0;

  return (
    <div className="space-y-8">
      <Panel className="flex flex-wrap items-center gap-6">
        <div className="flex-1">
          <h2 className="text-xl">Daily 10</h2>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIO_CATEGORIES.map((c) => {
          const acc = hydrated ? accuracy(progress.perCategory[c]) : null;
          const seen = hydrated ? Object.keys(progress.seen).length : 0;
          void seen;
          return (
            <Link key={c} href={`/trainer/${c}`} className="panel flex gap-4 p-4 hover:no-underline">
              <Ring value={acc} />
              <div className="min-w-0">
                <div className="display text-base text-gold-bright">{CATEGORY_LABELS[c]}</div>
                <p className="mt-1 text-xs text-dim">{CATEGORY_BLURBS[c]}</p>
                <div className="mt-2 text-[0.7rem] text-dim">
                  {counts[c]} drills · {hydrated ? `${progress.perCategory[c].correct}/${progress.perCategory[c].attempts} correct` : ""}
                </div>
              </div>
            </Link>
          );
        })}
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={value === null ? "No attempts yet" : `${Math.round(v * 100)}% accuracy`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-raised)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={`${c * v} ${c}`} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fill="var(--gold-bright)" fontSize={size * 0.24} fontFamily="var(--font-display)">
        {value === null ? "—" : `${Math.round(v * 100)}`}
      </text>
    </svg>
  );
}
