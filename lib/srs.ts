/**
 * SM-2-lite spaced repetition.
 *
 * A missed scenario comes back after 1 day, then 3, then 7, then 14…
 * A correct answer on a due card advances the interval; a miss resets it to
 * 1 day and counts a lapse. `ease` drifts down on misses and up on hits so
 * chronic misses reappear faster.
 */
export interface SrsEntry {
  scenarioId: string;
  ease: number; // 1.3 .. 2.5
  interval: number; // days
  dueAt: number; // epoch ms
  lapses: number;
  reps: number;
}

const DAY = 86_400_000;
const LADDER = [1, 3, 7];

export function newEntry(scenarioId: string, now = Date.now()): SrsEntry {
  return { scenarioId, ease: 2.5, interval: 0, dueAt: now, lapses: 0, reps: 0 };
}

export function review(entry: SrsEntry, correct: boolean, now = Date.now()): SrsEntry {
  const e = { ...entry, reps: entry.reps + 1 };
  if (!correct) {
    e.lapses += 1;
    e.ease = Math.max(1.3, e.ease - 0.2);
    e.interval = LADDER[0]!;
  } else {
    const step = LADDER.indexOf(e.interval);
    if (e.interval === 0) e.interval = LADDER[0]!;
    else if (step >= 0 && step < LADDER.length - 1) e.interval = LADDER[step + 1]!;
    else e.interval = Math.round(e.interval * e.ease);
    e.ease = Math.min(2.5, e.ease + 0.05);
  }
  e.dueAt = now + e.interval * DAY;
  return e;
}

export function isDue(entry: SrsEntry, now = Date.now()): boolean {
  return entry.dueAt <= now;
}
