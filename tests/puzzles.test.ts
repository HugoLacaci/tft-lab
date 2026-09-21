import { describe, expect, it } from "vitest";
import { grade } from "@/lib/grading";
import { ScenarioSchema, type Scenario } from "@/lib/scenario-schema";
import { DIFFICULTY_LABEL, RANK_TIERS, tierById, tierByLevel } from "@/lib/rank-tiers";
import { puzzleTitle } from "@/lib/puzzles";

const base = {
  id: "p-swap",
  category: "positioning" as const,
  difficulty: 2 as const,
  kind: "puzzle" as const,
  setAgnostic: true,
  prompt: "Which two units should trade places on this board?",
  state: {
    stage: "3-2",
    gold: 30,
    hp: 80,
    level: 5,
    xpToNext: 10,
    streak: { type: "win" as const, count: 1 },
    board: [
      { championId: "generic:carry-2", row: 0, col: 3, star: 2 as const, items: [] },
      { championId: "generic:tank-2", row: 3, col: 3, star: 2 as const, items: [] },
      { championId: "generic:caster-1", row: 3, col: 1, star: 1 as const, items: [] },
    ],
    bench: [],
    shop: [null, null, null, null, null],
    items: [],
  },
  question: { type: "swap" as const, correctPairs: [["generic:carry-2", "generic:tank-2"]] as [string, string][] },
  explanation: "The carry is in front and the tank is in the back; swapping them puts the damage behind the frontline where it survives.",
  principle: "Ranged in the back, melee in the front.",
  guideLink: "/guides/positioning",
};

describe("swap questions", () => {
  it("parse, default kind to drill, and reject pairs that are not on the board", () => {
    const s = ScenarioSchema.parse(base);
    expect(s.kind).toBe("puzzle");
    expect(ScenarioSchema.parse({ ...base, kind: undefined }).kind).toBe("drill");
    const bad = ScenarioSchema.safeParse({ ...base, question: { type: "swap", correctPairs: [["generic:carry-2", "generic:tank-5"]] } });
    expect(bad.success).toBe(false);
    const same = ScenarioSchema.safeParse({ ...base, question: { type: "swap", correctPairs: [["generic:carry-2", "generic:carry-2"]] } });
    expect(same.success).toBe(false);
  });

  it("grade the pair in either order, half credit for one right unit", () => {
    const q = ScenarioSchema.parse(base).question;
    expect(grade(q, ["generic:carry-2", "generic:tank-2"]).correct).toBe(true);
    expect(grade(q, ["generic:tank-2", "generic:carry-2"]).correct).toBe(true);
    const half = grade(q, ["generic:tank-2", "generic:caster-1"]);
    expect(half.correct).toBe(false);
    expect(half.score).toBe(0.5);
    expect(grade(q, ["generic:caster-1"]).score).toBe(0);
  });
});

describe("rank tiers", () => {
  it("cover difficulties 1..4 with unique ids", () => {
    expect(RANK_TIERS.map((t) => t.level)).toEqual([1, 2, 3, 4]);
    expect(new Set(RANK_TIERS.map((t) => t.id)).size).toBe(4);
    expect(tierById("master-plus")?.level).toBe(4);
    expect(tierByLevel(9).level).toBe(1);
    expect(DIFFICULTY_LABEL[3]).toMatch(/Emerald/);
  });
  it("accept difficulty 4 and reject 5", () => {
    expect(ScenarioSchema.safeParse({ ...base, difficulty: 4 }).success).toBe(true);
    expect(ScenarioSchema.safeParse({ ...base, difficulty: 5 }).success).toBe(false);
  });
});

describe("puzzleTitle", () => {
  it("prefers the title, else the first sentence of the prompt, truncated", () => {
    const s = ScenarioSchema.parse(base) as Scenario;
    expect(puzzleTitle({ ...s, title: "Swap them" })).toBe("Swap them");
    expect(puzzleTitle(s)).toBe("Which two units should trade places on this board?");
    const long = { ...s, prompt: "A".repeat(90) + ". Then more." };
    expect(puzzleTitle(long).length).toBeLessThanOrEqual(64);
  });
});

describe("scenario loader", () => {
  it("keeps set-specific scenarios for the live set (regression: filter index was read as the set number)", async () => {
    const { loadScenarios } = await import("@/lib/scenarios");
    const { CURRENT_SET, isSynced } = await import("@/lib/current-set");
    if (!isSynced()) return;
    const all = loadScenarios();
    const live = all.filter((s) => !s.setAgnostic && s.set === CURRENT_SET.setNumber);
    expect(live.length).toBeGreaterThan(0);
    expect(all.filter((s) => s.kind === "puzzle").length).toBeGreaterThanOrEqual(20);
  });
});
