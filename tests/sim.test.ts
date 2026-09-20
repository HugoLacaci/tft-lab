import { describe, expect, it } from "vitest";
import { activeTraits, augmentWeights, buildUnitStats, hexDistance, simulate, toCell, type SimData, type SimTeam } from "@/lib/sim";
import type { Augment, Champion, Item, Trait } from "@/lib/types";

function champ(id: string, cost: 1 | 2 | 3 | 4 | 5, traits: string[], over: Partial<Champion["stats"]> = {}, desc = "Deal damage to the target."): Champion {
  return {
    id,
    name: id,
    cost,
    traits,
    icon: "",
    stats: { hp: 600 + cost * 150, ad: 40 + cost * 10, armor: 30, mr: 30, range: 1, mana: 60, initialMana: 20, attackSpeed: 0.7, critChance: 0.25, critMultiplier: 1.4, ...over },
    ability: { name: "A", desc, icon: "", scaling: { ad: false, ap: true }, rich: desc },
  };
}
const trait = (id: string, bps: [number, Trait["breakpoints"][number]["style"]][]): Trait => ({ id, name: id, desc: "", icon: "", breakpoints: bps.map(([units, style]) => ({ units, style, desc: "" })) });
const item = (id: string, kind: Item["kind"], effects: Record<string, number>, associatedTraits: string[] = []): Item => ({ id, name: id, desc: "", icon: "", composition: [], kind, effects, associatedTraits, rich: "" });
const aug = (id: string, tier: Augment["tier"], desc: string, associatedTraits: string[] = []): Augment => ({ id, name: id, desc, icon: "", tier, associatedTraits });

const data: SimData = {
  champions: Object.fromEntries(
    [
      champ("tank", 2, ["Guard"], { hp: 1000, armor: 60, mr: 60 }),
      champ("carry", 4, ["Gunner"], { range: 4, ad: 80, hp: 700 }),
      champ("caster", 3, ["Mage"], { range: 3, mana: 50 }, "Blast enemies in an area and heal the lowest ally."),
      champ("weak", 1, ["Guard"], { hp: 400, ad: 30 }),
    ].map((c) => [c.id, c]),
  ),
  items: Object.fromEntries([item("bf", "component", { AD: 0.1 }), item("belt", "component", { Health: 150 }), item("emblem", "emblem", {}, ["Guard"]), item("bt", "completed", { AD: 0.15, LifeSteal: 20 })].map((i) => [i.id, i])),
  traits: Object.fromEntries(
    [
      trait("Guard", [
        [2, "bronze"],
        [4, "gold"],
      ]),
      trait("Gunner", [[2, "silver"]]),
      trait("Mage", [[3, "gold"]]),
    ].map((t) => [t.id, t]),
  ),
  augments: Object.fromEntries([aug("econ", "gold", "Gain 10 gold and 2 rerolls."), aug("dmg", "prismatic", "Your units gain 20% Attack Damage."), aug("crest", "silver", "Gain a Guard Emblem.", ["Guard"])].map((a) => [a.id, a])),
};

const team = (units: SimTeam["units"], augments: string[] = []): SimTeam => ({ units, augments });

describe("geometry", () => {
  it("blue frontline touches red frontline across the divider", () => {
    const b = toCell("blue", 0, 3);
    const r = toCell("red", 0, 3);
    expect(hexDistance(b, r)).toBe(1);
  });
  it("backlines are far apart", () => {
    expect(hexDistance(toCell("blue", 3, 0), toCell("red", 3, 0))).toBeGreaterThanOrEqual(7);
  });
});

describe("traits and augments", () => {
  it("counts emblems and crest augments towards a trait", () => {
    const t = activeTraits(team([{ championId: "tank", row: 0, col: 3, star: 2, items: [] }, { championId: "carry", row: 3, col: 3, star: 2, items: ["emblem"] }], ["crest"]), data);
    const guard = t.find((x) => x.id === "Guard")!;
    expect(guard.count).toBe(3);
    expect(guard.reached).toBe(2);
    expect(guard.style).toBe("bronze");
    expect(guard.next).toBe(4);
  });
  it("gives economy augments no combat weight and offensive ones damage", () => {
    const w = augmentWeights(team([], ["econ", "dmg"]), data);
    expect(w.notes.find((n) => n.id === "econ")!.offense).toBe(0);
    expect(w.notes.find((n) => n.id === "dmg")!.offense).toBeGreaterThan(0.1);
    expect(w.defense).toBe(0);
  });
});

describe("unit stats", () => {
  it("scales HP and AD with stars and applies item effects", () => {
    const ctx = { traits: [], augments: { offense: 0, defense: 0, notes: [] } };
    const one = buildUnitStats({ championId: "carry", row: 3, col: 3, star: 1, items: [] }, team([]), data, ctx)!;
    const two = buildUnitStats({ championId: "carry", row: 3, col: 3, star: 2, items: ["bf", "belt"] }, team([]), data, ctx)!;
    expect(one.maxHp).toBe(700);
    expect(two.maxHp).toBe(Math.round(700 * 1.8 + 150));
    expect(two.ad).toBeCloseTo(80 * 1.5 * 1.1, 5);
    expect(two.lifesteal).toBe(0);
    const bt = buildUnitStats({ championId: "carry", row: 3, col: 3, star: 1, items: ["bt"] }, team([]), data, ctx)!;
    expect(bt.lifesteal).toBeCloseTo(0.2, 5);
  });
  it("reads utility keywords from the ability text", () => {
    const ctx = { traits: [], augments: { offense: 0, defense: 0, notes: [] } };
    const s = buildUnitStats({ championId: "caster", row: 3, col: 3, star: 1, items: [] }, team([]), data, ctx)!;
    expect(s.utility.aoe).toBe(true);
    expect(s.utility.heal).toBe(true);
    expect(s.utility.stun).toBe(false);
  });
});

describe("simulate", () => {
  it("is deterministic for a seed and the stronger board wins", () => {
    const strong = team([
      { championId: "tank", row: 0, col: 3, star: 3, items: ["belt"] },
      { championId: "carry", row: 3, col: 3, star: 3, items: ["bf", "bf", "bt"] },
      { championId: "caster", row: 3, col: 1, star: 2, items: [] },
    ]);
    const weak = team([
      { championId: "weak", row: 0, col: 3, star: 1, items: [] },
      { championId: "weak", row: 0, col: 4, star: 1, items: [] },
    ]);
    const a = simulate(strong, weak, data, { runs: 50, seed: 1 });
    const b = simulate(strong, weak, data, { runs: 50, seed: 1 });
    expect(a.blueWins).toBe(b.blueWins);
    expect(a.blueWins).toBe(50);
    expect(a.avgDuration).toBeLessThan(30);
    expect(a.units.find((u) => u.key === "blue:3,3")!.damageDealt).toBeGreaterThan(0);
    const mirrored = simulate(weak, strong, data, { runs: 20, seed: 2 });
    expect(mirrored.redWins).toBe(20);
  });
  it("reports every unit once with per-run averages", () => {
    const t = team([{ championId: "tank", row: 0, col: 3, star: 2, items: [] }]);
    const r = simulate(t, t, data, { runs: 10, seed: 3 });
    expect(r.units.length).toBe(2);
    for (const u of r.units) {
      expect(u.survived).toBeGreaterThanOrEqual(0);
      expect(u.survived).toBeLessThanOrEqual(1);
    }
    expect(r.blueWins + r.redWins + r.draws).toBe(10);
  });
  it("an empty side loses immediately", () => {
    const t = team([{ championId: "tank", row: 0, col: 3, star: 1, items: [] }]);
    const r = simulate(t, team([]), data, { runs: 3, seed: 4 });
    expect(r.blueWins).toBe(3);
    expect(r.avgDuration).toBe(0);
  });
});
