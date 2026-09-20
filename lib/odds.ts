import type { Cost } from "./costs";
import { mulberry32 } from "./daily";

/**
 * Roll-odds model.
 *
 * Each of the 5 shop slots is an independent draw:
 *   P(slot shows the target) = tierOdds[level][cost] × copiesRemaining / poolRemainingForTier
 * where copiesRemaining = poolSize − copies others hold − copies I hold, and
 * poolRemainingForTier = poolSize × distinctChampions − every copy of that
 * tier that has left the pool (the target's and, optionally, other units').
 *
 * The closed form below is exact for one slot / one roll under that model.
 * A Monte-Carlo rolldown (`simulateRolldown`) handles depletion: every copy
 * bought lowers both numerator and denominator for the next slot.
 */
export interface OddsInput {
  cost: Cost;
  level: number;
  /** Copies of the target held by other players (or otherwise gone). */
  copiesTakenByOthers: number;
  /** Copies of the target I already hold (they leave the pool too). */
  copiesIHave: number;
  /** Other copies of the same tier out of the pool (all players' boards). */
  otherTierCopiesTaken: number;
  gold: number;
  rollCost?: number;
}

export interface OddsConstants {
  tierOdds: number[]; // percent for this level, index cost-1
  poolSize: Record<Cost, number>;
  distinctChampions: Record<Cost, number>;
}

export function slotProbability(inp: OddsInput, k: OddsConstants): number {
  const tierPct = (k.tierOdds[inp.cost - 1] ?? 0) / 100;
  const copiesRemaining = Math.max(0, k.poolSize[inp.cost] - inp.copiesTakenByOthers - inp.copiesIHave);
  const tierTotal = k.poolSize[inp.cost] * k.distinctChampions[inp.cost];
  const tierRemaining = Math.max(1, tierTotal - inp.copiesTakenByOthers - inp.copiesIHave - inp.otherTierCopiesTaken);
  if (copiesRemaining === 0) return 0;
  return tierPct * (copiesRemaining / tierRemaining);
}

/** Probability that at least one of the 5 slots shows the target on one roll. */
export function rollProbability(p: number): number {
  return 1 - Math.pow(1 - p, 5);
}

export interface RolldownResult {
  rolls: number;
  slotP: number;
  expectedCopies: number; // Monte-Carlo mean
  expectedCopiesClosedForm: number; // 5 × rolls × p, no depletion
  /** distribution[k] = P(exactly k copies found) */
  distribution: number[];
  pTwoStar: number;
  pThreeStar: number;
  needTwo: number;
  needThree: number;
}

export function simulateRolldown(inp: OddsInput, k: OddsConstants, iterations = 10_000, seed = 12345): RolldownResult {
  const rollCost = inp.rollCost ?? 2;
  const rolls = Math.max(0, Math.floor(inp.gold / rollCost));
  const rnd = mulberry32(seed);
  const tierPct = (k.tierOdds[inp.cost - 1] ?? 0) / 100;
  const tierTotal = k.poolSize[inp.cost] * k.distinctChampions[inp.cost];
  const startCopies = Math.max(0, k.poolSize[inp.cost] - inp.copiesTakenByOthers - inp.copiesIHave);
  const startTier = Math.max(1, tierTotal - inp.copiesTakenByOthers - inp.copiesIHave - inp.otherTierCopiesTaken);
  const needTwo = Math.max(0, 3 - inp.copiesIHave);
  const needThree = Math.max(0, 9 - inp.copiesIHave);

  const counts = new Array<number>(startCopies + 1).fill(0);
  let sum = 0;
  for (let it = 0; it < iterations; it++) {
    let copies = startCopies;
    let tier = startTier;
    let found = 0;
    for (let r = 0; r < rolls && copies > 0; r++) {
      for (let s = 0; s < 5 && copies > 0; s++) {
        const p = tierPct * (copies / tier);
        if (rnd() < p) {
          found++;
          copies--;
          tier--;
        }
      }
    }
    counts[found]!++;
    sum += found;
  }
  const distribution = counts.map((c) => c / iterations);
  const atLeast = (n: number) => distribution.slice(n).reduce((a, b) => a + b, 0);
  const slotP = slotProbability(inp, k);
  return {
    rolls,
    slotP,
    expectedCopies: sum / iterations,
    expectedCopiesClosedForm: 5 * rolls * slotP,
    distribution,
    pTwoStar: needTwo === 0 ? 1 : atLeast(needTwo),
    pThreeStar: needThree === 0 ? 1 : atLeast(needThree),
    needTwo,
    needThree,
  };
}
