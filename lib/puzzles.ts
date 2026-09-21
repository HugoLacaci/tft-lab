import { loadScenarios } from "./scenarios";
import type { Scenario } from "./scenario-schema";
import { RANK_TIERS, type Difficulty } from "./rank-tiers";

/**
 * Tactics puzzles are scenarios with `kind: "puzzle"`: one board, one best
 * move, graded by rank tier like chess puzzles are graded by rating. They
 * still belong to a category (positioning, scouting…) so the category drills,
 * the Daily 10 and the SRS include them; this module just groups them by tier.
 */
export function loadPuzzles(): Scenario[] {
  return loadScenarios().filter((s) => s.kind === "puzzle");
}

export function puzzlesByTier(level: Difficulty): Scenario[] {
  return loadPuzzles().filter((s) => s.difficulty === level);
}

export function puzzleCounts(): Record<Difficulty, number> {
  const out = Object.fromEntries(RANK_TIERS.map((t) => [t.level, 0])) as Record<Difficulty, number>;
  for (const s of loadPuzzles()) out[s.difficulty]++;
  return out;
}

/** Short title for cards: the scenario's own title, else the first sentence of the prompt. */
export function puzzleTitle(s: Scenario): string {
  if (s.title) return s.title;
  const first = s.prompt.split(/(?<=[.!?])\s/)[0] ?? s.prompt;
  return first.length > 64 ? `${first.slice(0, 61).trimEnd()}…` : first;
}
