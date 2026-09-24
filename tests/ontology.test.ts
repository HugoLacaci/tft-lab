import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { compile } from "json-schema-to-typescript";
import { OPTIONS } from "@/packages/ontology/scripts/options.mjs";
import schema from "@/packages/ontology/schema/game-state.schema.json";
import { DEFAULT_RULES, deriveDecision, deriveDecisions, estimateIncome, interestOn, roundAt, validateDecision, validateTimeline, type EconRules, type GameTimeline, type PlacedUnit as OntologyUnit, type RoundState } from "@/packages/ontology/ts";
import type { PlacedUnit as TrainerUnit } from "@/lib/scenario-schema";

// ── Type-level guard: the ontology's PlacedUnit IS the trainer's PlacedUnit ──
const _toTrainer: TrainerUnit = {} as OntologyUnit;
const _toOntology: OntologyUnit = {} as TrainerUnit;
void _toTrainer;
void _toOntology;

const COST: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
const rules: EconRules = { ...DEFAULT_RULES, costOf: (id) => COST[id] };

function state(p: Partial<RoundState> & { stage: string; gold: number }): RoundState {
  const [s, r] = p.stage.split("-").map(Number);
  return {
    matchId: "t",
    stageNumber: s!,
    roundNumber: r!,
    phase: "planning",
    health: 80,
    level: 5,
    xp: { current: 0, needed: 36 },
    streak: { type: "win", count: 0 },
    board: [],
    bench: [],
    shop: [null, null, null, null, null],
    benchItems: [],
    activeTraits: [],
    augments: [],
    confidence: {},
    provenance: "manual",
    ...p,
  };
}
const u = (championId: string, row: number, col: number, star: 1 | 2 | 3 = 1, items: string[] = []) => ({ championId, row, col, star, items });

describe("ontology codegen", () => {
  it("generated types are in sync with the schema", async () => {
    const generated = fs.readFileSync(path.join(process.cwd(), "packages", "ontology", "ts", "types.ts"), "utf8");
    const fresh = await compile(schema as never, "GameState", OPTIONS as Parameters<typeof compile>[2]);
    expect(fresh.replace(/\r\n/g, "\n")).toBe(generated.replace(/\r\n/g, "\n"));
  });
});

describe("fixtures", () => {
  const files = fs.readdirSync(path.join(process.cwd(), "packages", "ontology", "fixtures")).filter((f) => f.endsWith(".json"));
  const timelines = files.map((f) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "packages", "ontology", "fixtures", f), "utf8")) as GameTimeline);
  const set = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "generated", "set-18.json"), "utf8")) as { champions: { id: string; cost: number }[]; items: { id: string; composition: string[] }[] };
  const cost = Object.fromEntries(set.champions.map((c) => [c.id, c.cost]));
  const recipes = Object.fromEntries(set.items.filter((i) => i.composition.length === 2).map((i) => [i.id, i.composition]));
  const live: EconRules = { ...DEFAULT_RULES, costOf: (id) => cost[id], recipeOf: (id) => recipes[id] };

  it("there are three and they validate against the schema", () => {
    expect(files.length).toBe(3);
    for (const t of timelines) {
      const r = validateTimeline(t);
      expect(r.ok, `${t.matchId}: ${!r.ok ? r.errors.join("; ") : ""}`).toBe(true);
      expect(t.rounds.length).toBeGreaterThan(20);
      for (const s of t.rounds) expect(s.board.length).toBeLessThanOrEqual(s.level);
    }
  });

  it("every decision validates and the accounting balances except at the deliberate perception gap", () => {
    for (const t of timelines) {
      const ds = deriveDecisions(t, live);
      expect(ds.length).toBe(t.rounds.length - 1);
      for (const d of ds) expect(validateDecision(d).ok, `${t.matchId} ${d.fromStage}→${d.toStage}`).toBe(true);
      const low = ds.filter((d) => d.lowConfidence).map((d) => `${d.fromStage}${d.fromIndex % 2 ? "e" : "s"}→${d.toStage}`);
      if (t.matchId === "fixture-fast-9-failed-rolldown") {
        // 3-5 end was misread (gold 20, real 23): the decision into it and the one out of it are flagged, nothing else.
        expect(low).toEqual(["3-5s→3-5", "3-5e→3-6"]);
        const gap = ds.find((d) => d.fromStage === "3-5" && d.toStage === "3-5")!;
        expect(gap.residual).toBe(1);
        expect(gap.notes?.join(" ")).toMatch(/low confidence/);
      } else {
        expect(low, `${t.matchId} low-confidence decisions`).toEqual([]);
        for (const d of ds) expect(d.residual).toBe(0);
      }
    }
  });

  it("pairs combined components by recipe", () => {
    const t = timelines.find((x) => x.matchId === "fixture-blossom-tempo-3rd")!;
    const combos = deriveDecisions(t, live).flatMap((d) => d.itemsCombined);
    expect(combos).toEqual(
      expect.arrayContaining([
        { from: ["DA_Component_NeedlesslyLargeRod", "DA_Component_TearOfTheGoddess"], to: "DA_ArchangelsStaff" },
        { from: ["DA_Component_ChainVest", "DA_Component_GiantsBelt"], to: "DA_SunfireCape" },
        { from: ["DA_Component_RecurveBow", "DA_Component_SparringGloves"], to: "DA_LastWhisper" },
      ]),
    );
  });

  it("reads the story out of the reroll fixture", () => {
    const t = timelines.find((x) => x.matchId === "fixture-khazix-reroll-2nd")!;
    const ds = deriveDecisions(t, live);
    const threeStar = ds.find((d) => d.starUpsAchieved.some((s) => s.championId === "DA_18_KhaZix" && s.star === 3))!;
    expect(threeStar.fromStage).toBe("4-3");
    expect(threeStar.rolls).toBe(5);
    const rollsInStage4 = ds.filter((d) => d.fromStage.startsWith("4-") && d.fromStage === d.toStage).reduce((a, d) => a + d.rolls, 0);
    expect(rollsInStage4).toBe(11);
    // Never levelled past 6 in this window.
    expect(Math.max(...t.rounds.map((r) => r.level))).toBe(6);
  });

  it("video timestamps resolve to the nearest earlier round", () => {
    const t = timelines.find((x) => x.matchId === "fixture-blossom-tempo-3rd")!;
    expect(roundAt(t, 0)).toBeNull();
    expect(roundAt(t, 60_000)?.stage).toBe("2-1");
    const r = roundAt(t, 60_000 + 90_000 * 3 + 10_000)!;
    expect(r.stage).toBe("2-4");
    expect(roundAt(timelines.find((x) => x.matchId === "fixture-khazix-reroll-2nd")!, 10_000)).toBeNull();
  });
});

describe("deriveDecision", () => {
  it("solves rolls from the accounting equation within a planning phase", () => {
    const a = state({ stage: "3-2", gold: 30, shop: ["A", "B", null, null, null], board: [u("A", 0, 0)] });
    const b = state({ stage: "3-2", gold: 21, shop: ["C", null, null, null, "E"], board: [u("A", 0, 0), u("B", 0, 1)] });
    const d = deriveDecision(a, b, 0, 1, rules);
    expect(d.income).toBe(0);
    expect(d.incomeEstimated).toBe(false);
    expect(d.bought).toEqual([{ championId: "B", copies: 1, cost: 2 }]);
    expect(d.rolls).toBe(3); // 30 − 2 − 21 = 7 → not even... see next assertion
    expect(d.residual).toBe(1);
    expect(d.lowConfidence).toBe(true);
    expect(d.interestLost).toBe(1);
  });

  it("balances exactly when the numbers add up, and records evidence with stage and field", () => {
    const a = state({ stage: "3-2", gold: 30, board: [u("A", 0, 0)] });
    const b = state({ stage: "3-2", gold: 22, shop: ["C", null, null, null, "E"], board: [u("A", 0, 0), u("B", 0, 1)] });
    const d = deriveDecision(a, b, 0, 1, rules);
    expect(d.rolls).toBe(3);
    expect(d.residual).toBe(0);
    expect(d.lowConfidence).toBe(false);
    expect(d.evidence).toEqual(expect.arrayContaining([{ stage: "3-2", field: "gold", value: "30", confidence: 1 }, { stage: "3-2", field: "gold", value: "22", confidence: 1 }]));
  });

  it("estimates income across rounds from base, interest and streak, and flags it", () => {
    const a = state({ stage: "3-2", gold: 50, streak: { type: "win", count: 3 } });
    const b = state({ stage: "3-3", gold: 61, streak: { type: "win", count: 4 } });
    expect(estimateIncome(a, b, rules)).toBe(5 + 5 + 2);
    const d = deriveDecision(a, b, 0, 1, rules);
    expect(d.income).toBe(12);
    expect(d.incomeEstimated).toBe(true);
    expect(d.residual).toBe(1); // 62 expected, 61 seen
    expect(d.lowConfidence).toBe(true);
  });

  it("counts copies: a third copy is a star-up, a sale returns cost × copies", () => {
    const a = state({ stage: "2-3", gold: 10, board: [u("A", 0, 0), u("B", 0, 1)], bench: [{ championId: "A", star: 1, items: [] }] });
    const b = state({ stage: "2-3", gold: 11, board: [u("A", 0, 0, 2)], bench: [] });
    const d = deriveDecision(a, b, 0, 1, rules);
    expect(d.bought).toEqual([{ championId: "A", copies: 1, cost: 1 }]);
    expect(d.sold).toEqual([{ championId: "B", copies: 1, gold: 2 }]);
    expect(d.starUpsAchieved).toEqual([{ championId: "A", star: 2 }]);
    expect(d.residual).toBe(0);
  });

  it("infers XP purchases, levelling, item equips and combines, repositioning and the augment", () => {
    const a = state({ stage: "3-2", gold: 40, level: 5, xp: { current: 28, needed: 36 }, board: [u("A", 0, 3), u("D", 3, 0)], benchItems: ["sword", "bow"], augmentOptions: ["x", "y", "z"] });
    const b = state({ stage: "3-2", gold: 32, level: 6, xp: { current: 0, needed: 48 }, board: [u("A", 0, 2), u("D", 3, 6, 1, ["ie"])], benchItems: [], augments: ["y"] });
    const d = deriveDecision(a, b, 0, 1, rules);
    expect(d.xpBought).toBe(2);
    expect(d.levelled).toBe(true);
    expect(d.rolls).toBe(0);
    expect(d.residual).toBe(0);
    expect(d.itemsEquipped).toEqual([{ itemId: "ie", toUnitId: "D" }]);
    expect(d.itemsCombined).toEqual([{ from: ["sword", "bow"], to: "ie" }]);
    expect(d.repositioned).toEqual([
      { unitId: "A", from: { row: 0, col: 3 }, to: { row: 0, col: 2 } },
      { unitId: "D", from: { row: 3, col: 0 }, to: { row: 3, col: 6 } },
    ]);
    expect(d.augmentPicked).toEqual({ chosen: "y", offered: ["x", "y", "z"] });
  });

  it("marks low-confidence gold reads and unknown costs instead of guessing", () => {
    const a = state({ stage: "4-1", gold: 20, confidence: { gold: 0.5 }, provenance: "vision" });
    const b = state({ stage: "4-1", gold: 18, board: [u("Z", 0, 0)] });
    const d = deriveDecision(a, b, 0, 1, rules);
    expect(d.lowConfidence).toBe(true);
    expect(d.notes?.join(" ")).toMatch(/unknown cost for Z/);
    expect(d.notes?.join(" ")).toMatch(/low confidence/);
    expect(d.evidence[0]).toMatchObject({ field: "gold", value: "20", confidence: 0.5 });
  });

  it("interest helper", () => {
    expect(interestOn(0)).toBe(0);
    expect(interestOn(49)).toBe(4);
    expect(interestOn(50)).toBe(5);
    expect(interestOn(120)).toBe(5);
  });
});
