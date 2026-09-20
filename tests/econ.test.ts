import { describe, expect, it } from "vitest";
import { interestFor, nextStage, project, streakGold, type EconConstants } from "@/lib/econ";

const K: EconConstants = {
  baseIncome: 5,
  interest: { per: 10, cap: 5 },
  streakGold: [
    { streak: "0–1", gold: 0 },
    { streak: "2", gold: 1 },
    { streak: "3", gold: 1 },
    { streak: "4", gold: 2 },
    { streak: "5", gold: 2 },
    { streak: "6+", gold: 3 },
  ],
  xpToLevel: [
    { level: 2, xp: 2 },
    { level: 3, xp: 6 },
    { level: 4, xp: 10 },
    { level: 5, xp: 20 },
    { level: 6, xp: 36 },
    { level: 7, xp: 48 },
    { level: 8, xp: 76 },
    { level: 9, xp: 84 },
    { level: 10, xp: 100 },
  ],
  passiveXp: 2,
  xpPerPurchase: { xp: 4, gold: 4 },
};

describe("econ helpers", () => {
  it("interest caps at 5", () => {
    expect(interestFor(49, K.interest)).toBe(4);
    expect(interestFor(50, K.interest)).toBe(5);
    expect(interestFor(90, K.interest)).toBe(5);
  });
  it("streak gold brackets", () => {
    expect(streakGold(1, K.streakGold)).toBe(0);
    expect(streakGold(3, K.streakGold)).toBe(1);
    expect(streakGold(4, K.streakGold)).toBe(2);
    expect(streakGold(9, K.streakGold)).toBe(3);
  });
  it("stage progression wraps at 7", () => {
    expect(nextStage("3-6")).toBe("3-7");
    expect(nextStage("3-7")).toBe("4-1");
  });
});

describe("project", () => {
  it("save: gold compounds with interest", () => {
    const rows = project({ stage: "3-2", gold: 40, level: 6, xp: 0, streak: { type: "win", count: 2 } }, { type: "save" }, K, 3);
    expect(rows[0]!.interest).toBe(4);
    expect(rows[0]!.goldEnd).toBe(40 + 5 + 4 + 1);
    expect(rows[1]!.interest).toBe(5);
  });
  it("level: buys XP and levels up when threshold reached", () => {
    const rows = project({ stage: "4-1", gold: 30, level: 7, xp: 44, streak: { type: "loss", count: 0 } }, { type: "level", purchasesPerRound: 1 }, K, 1);
    expect(rows[0]!.spent).toBe(4);
    expect(rows[0]!.level).toBe(7);
    expect(rows[0]!.xp).toBe(50); // 44 + 2 passive + 4 bought, need 76
  });
  it("roll: never below the floor", () => {
    const rows = project({ stage: "3-2", gold: 52, level: 6, xp: 0, streak: { type: "loss", count: 3 } }, { type: "roll", goldPerRound: 10, floor: 50 }, K, 2);
    expect(rows[0]!.spent).toBe(2);
    expect(rows[0]!.goldEnd).toBeGreaterThanOrEqual(50);
  });
});
