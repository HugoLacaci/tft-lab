import type { Scenario } from "./scenario-schema";
import type { Progress } from "./progress";
import { weight } from "./progress";
import { isDue } from "./srs";
import type { ScenarioCategory } from "./scenario-categories";

/** Deterministic PRNG so a Daily 10 is stable for a given seed (e.g. the date). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Draw `n` scenarios: due SRS cards first, then a weighted sample that leans
 * toward the user's weakest categories (with optional extra weight from the
 * tracker's leak tags). Never repeats a scenario in one draw.
 */
export function drawDaily(
  all: Scenario[],
  progress: Progress,
  n = 10,
  opts: { seed?: number; extraWeights?: Partial<Record<ScenarioCategory, number>>; now?: number } = {},
): Scenario[] {
  const rnd = mulberry32(opts.seed ?? Date.now());
  const now = opts.now ?? Date.now();
  const picked: Scenario[] = [];
  const used = new Set<string>();

  const due = all.filter((s) => progress.srs[s.id] && isDue(progress.srs[s.id]!, now)).sort((a, b) => progress.srs[a.id]!.dueAt - progress.srs[b.id]!.dueAt);
  for (const s of due) {
    if (picked.length >= Math.ceil(n / 2)) break;
    picked.push(s);
    used.add(s.id);
  }

  const pool = all.filter((s) => !used.has(s.id));
  while (picked.length < n && pool.length > 0) {
    const weights = pool.map((s) => {
      const w = weight(progress, s.category, opts.extraWeights);
      const seen = progress.seen[s.id];
      const novelty = seen ? 1 / (1 + seen.attempts) : 1.2;
      return w * novelty;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= weights[idx]!;
      if (r <= 0) break;
    }
    const s = pool.splice(Math.min(idx, pool.length - 1), 1)[0]!;
    picked.push(s);
  }
  return picked;
}
