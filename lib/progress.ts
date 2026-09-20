import { SCENARIO_CATEGORIES, type ScenarioCategory } from "./scenario-categories";
import type { SrsEntry } from "./srs";

/** Persisted trainer progress (localStorage, key tftlab.progress.v1). */
export interface Progress {
  version: 1;
  perCategory: Record<ScenarioCategory, { attempts: number; correct: number }>;
  /** Last 20 outcomes, newest last. */
  rolling: boolean[];
  /** ISO dates (YYYY-MM-DD) with at least one answered question. */
  activeDays: string[];
  srs: Record<string, SrsEntry>;
  /** scenarioId → times answered correctly (for progress rings). */
  seen: Record<string, { attempts: number; correct: number }>;
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    perCategory: Object.fromEntries(SCENARIO_CATEGORIES.map((c) => [c, { attempts: 0, correct: 0 }])) as Progress["perCategory"],
    rolling: [],
    activeDays: [],
    srs: {},
    seen: {},
  };
}

export function isoDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Consecutive days ending today or yesterday. */
export function dayStreak(activeDays: string[], today = isoDay()): number {
  const set = new Set(activeDays);
  let streak = 0;
  const d = new Date(`${today}T00:00:00Z`);
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

export function accuracy(a: { attempts: number; correct: number }): number | null {
  return a.attempts === 0 ? null : a.correct / a.attempts;
}

export function rollingAccuracy(rolling: boolean[]): number | null {
  if (rolling.length === 0) return null;
  return rolling.filter(Boolean).length / rolling.length;
}

/**
 * Weakest categories first (lowest accuracy; unseen categories count as
 * weak). Used by Daily 10 and by the tracker's readout.
 */
export function weakestCategories(p: Progress, extraWeights?: Partial<Record<ScenarioCategory, number>>): ScenarioCategory[] {
  return [...SCENARIO_CATEGORIES].sort((a, b) => weight(p, b, extraWeights) - weight(p, a, extraWeights));
}

export function weight(p: Progress, c: ScenarioCategory, extra?: Partial<Record<ScenarioCategory, number>>): number {
  const acc = accuracy(p.perCategory[c]);
  const base = acc === null ? 0.6 : 1 - acc; // unseen = moderately weak
  return base + 0.15 * (extra?.[c] ?? 0) + 0.05;
}
