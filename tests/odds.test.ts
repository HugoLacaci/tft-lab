import { describe, expect, it } from "vitest";
import { rollProbability, simulateRolldown, slotProbability, type OddsConstants } from "@/lib/odds";

const K: OddsConstants = {
  tierOdds: [15, 20, 32, 30, 3], // level 8
  poolSize: { 1: 30, 2: 25, 3: 18, 4: 10, 5: 9 },
  distinctChampions: { 1: 14, 2: 13, 3: 14, 4: 14, 5: 19 },
};

describe("slotProbability (closed form)", () => {
  it("untouched pool: 0.30 × 10/140", () => {
    const p = slotProbability({ cost: 4, level: 8, copiesTakenByOthers: 0, copiesIHave: 0, otherTierCopiesTaken: 0, gold: 0 }, K);
    expect(p).toBeCloseTo(0.3 * (10 / 140), 6);
  });
  it("3 copies gone and 20 other 4-costs out: 0.30 × 7/117", () => {
    const p = slotProbability({ cost: 4, level: 8, copiesTakenByOthers: 2, copiesIHave: 1, otherTierCopiesTaken: 20, gold: 0 }, K);
    expect(p).toBeCloseTo(0.3 * (7 / 117), 6);
  });
  it("no copies left → 0", () => {
    expect(slotProbability({ cost: 4, level: 8, copiesTakenByOthers: 10, copiesIHave: 0, otherTierCopiesTaken: 0, gold: 0 }, K)).toBe(0);
  });
  it("rollProbability = 1 − (1−p)^5", () => {
    expect(rollProbability(0.1)).toBeCloseTo(1 - 0.9 ** 5, 10);
  });
});

describe("simulateRolldown", () => {
  it("is deterministic for a seed and matches the closed form when depletion is small", () => {
    const inp = { cost: 4 as const, level: 8, copiesTakenByOthers: 0, copiesIHave: 0, otherTierCopiesTaken: 0, gold: 20 };
    const a = simulateRolldown(inp, K, 4000, 7);
    const b = simulateRolldown(inp, K, 4000, 7);
    expect(a.expectedCopies).toBe(b.expectedCopies);
    expect(a.rolls).toBe(10);
    expect(Math.abs(a.expectedCopies - a.expectedCopiesClosedForm)).toBeLessThan(0.15);
    expect(a.distribution.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
  });
  it("2★ needs 3 − held copies; already 2★ → probability 1", () => {
    const r = simulateRolldown({ cost: 4, level: 8, copiesTakenByOthers: 0, copiesIHave: 3, otherTierCopiesTaken: 0, gold: 0 }, K, 100);
    expect(r.pTwoStar).toBe(1);
    expect(r.needThree).toBe(6);
  });
});
