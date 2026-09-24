import { SCENARIO_CATEGORIES, type ScenarioCategory } from "./scenario-categories";
import type { SrsEntry } from "./srs";

/** Persisted trainer progress (localStorage, key tftlab.progress.v1). */
export interface SeenEntry {
  attempts: number;
  correct: number;
  /** Outcome of the most recent attempt (missing on entries written before replays existed). */
  last?: boolean;
  /** Attempts on which the hint was opened before answering. */
  hinted?: number;
  /** epoch ms of the most recent attempt */
  at?: number;
}

export interface Progress {
  version: 1;
  perCategory: Record<ScenarioCategory, { attempts: number; correct: number }>;
  /** Last 20 outcomes, newest last. */
  rolling: boolean[];
  /** ISO dates (YYYY-MM-DD) with at least one answered question. */
  activeDays: string[];
  srs: Record<string, SrsEntry>;
  /** scenarioId → times answered / answered correctly (for progress rings, lesson state and replays). */
  seen: Record<string, SeenEntry>;
  /**
   * Self-declared starting point on the learning path: the highest module index
   * (lib/curriculum.ts) the player unlocked by placing themselves ("I'm Gold").
   * Undefined until asked; the path then behaves as if it were 1.
   */
  placed?: number;
  /** lesson id → ISO date it was first passed. */
  lessonsPassed?: Record<string, string>;
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

/**
 * Drills to replay: the most recent attempt was wrong. Entries written before
 * `last` existed count as missed when they were never answered correctly.
 * Most recently missed first.
 */
export function missedIds(p: Progress): string[] {
  return Object.entries(p.seen)
    .filter(([, e]) => (e.last === undefined ? e.correct === 0 : !e.last))
    .sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
    .map(([id]) => id);
}

/** Categories where the player misses most, with enough attempts to mean something. Weakest first. */
export function weakSpots(p: Progress, minAttempts = 3): { category: ScenarioCategory; accuracy: number; attempts: number }[] {
  return SCENARIO_CATEGORIES.map((c) => ({ category: c, attempts: p.perCategory[c].attempts, accuracy: accuracy(p.perCategory[c]) ?? 1 }))
    .filter((x) => x.attempts >= minAttempts)
    .sort((a, b) => a.accuracy - b.accuracy);
}
