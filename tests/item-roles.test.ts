import { describe, expect, it } from "vitest";
import { itemRole, roleOfEffects } from "@/lib/item-roles";
import { emblemGroup, inferTraitKinds } from "@/lib/trait-kinds";

const COMPONENTS: Record<string, string> = {
  sword: "B.F. Sword",
  bow: "Recurve Bow",
  gloves: "Sparring Gloves",
  rod: "Needlessly Large Rod",
  tear: "Tear Of The Goddess",
  vest: "Chain Vest",
  cloak: "Negatron Cloak",
  belt: "Giant's Belt",
  spatula: "Spatula",
  pan: "Frying Pan",
};
const name = (id: string) => COMPONENTS[id];
const completed = (composition: string[]) => ({ kind: "completed", name: "x", composition, effects: {} });

describe("itemRole", () => {
  it("reads completed items from their recipe", () => {
    expect(itemRole(completed(["sword", "bow"]), name)).toBe("physical");
    expect(itemRole(completed(["sword", "cloak"]), name)).toBe("physical"); // Bloodthirster
    expect(itemRole(completed(["rod", "tear"]), name)).toBe("mage");
    expect(itemRole(completed(["rod", "vest"]), name)).toBe("mage"); // Crownguard
    expect(itemRole(completed(["rod", "belt"]), name)).toBe("mage"); // Morellonomicon
    expect(itemRole(completed(["tear", "tear"]), name)).toBe("mage"); // Blue Buff
    expect(itemRole(completed(["vest", "cloak"]), name)).toBe("tank");
    expect(itemRole(completed(["tear", "vest"]), name)).toBe("tank"); // Protector's Vow
    expect(itemRole(completed(["tear", "belt"]), name)).toBe("tank"); // Redemption
    expect(itemRole(completed(["belt", "sword"]), name)).toBe("bruiser"); // Sterak's
    expect(itemRole(completed(["sword", "rod"]), name)).toBe("hybrid"); // Gunblade
    expect(itemRole(completed(["sword", "tear"]), name)).toBe("hybrid"); // Shojin
    expect(itemRole(completed(["spatula", "vest"]), name)).toBe("utility");
  });
  it("reads components from their name", () => {
    expect(itemRole({ kind: "component", name: "Chain Vest", composition: [], effects: {} }, name)).toBe("tank");
    expect(itemRole({ kind: "component", name: "Tear Of The Goddess", composition: [], effects: {} }, name)).toBe("mage");
    expect(itemRole({ kind: "component", name: "Spatula", composition: [], effects: {} }, name)).toBe("utility");
  });
  it("falls back to the stat effects for items without a recipe", () => {
    expect(roleOfEffects({ AD: 0.55, BonusDamage: 0.1 })).toBe("physical");
    expect(roleOfEffects({ AP: 30, ManaRegen: 1 })).toBe("mage");
    expect(roleOfEffects({ Armor: 50, PercentMaxHP: 0.06 })).toBe("tank");
    expect(roleOfEffects({ AD: 0.2, Health: 200 })).toBe("bruiser");
    expect(roleOfEffects({ AD: 0.15, AP: 15 })).toBe("hybrid");
    expect(roleOfEffects({ PercentGoldChance: 0.3 })).toBe("utility");
    expect(itemRole({ kind: "artifact", name: "x", composition: [], effects: { AS: 30 } }, name)).toBe("physical");
  });
});

describe("inferTraitKinds", () => {
  const items = [
    { kind: "emblem", composition: ["spatula", "belt"], associatedTraits: ["fae"] },
    { kind: "emblem", composition: ["pan", "rod"], associatedTraits: ["spellweaver"] },
    { kind: "emblem", composition: [], associatedTraits: ["coven"] },
    { kind: "emblem", composition: [], associatedTraits: ["defender"] },
    { kind: "emblem", composition: [], associatedTraits: [] },
  ];
  const champions = [
    { traits: ["coven", "spellweaver"] }, // known class → coven is an origin
    { traits: ["fae", "defender"] }, // known origin → defender is a class
    { traits: ["mystery", "riddle"] }, // nothing known: stays out
  ];
  const kinds = inferTraitKinds(champions, items, name);
  it("marks Spatula emblems as origins and Frying Pan emblems as classes", () => {
    expect(kinds.fae).toBe("origin");
    expect(kinds.spellweaver).toBe("class");
  });
  it("propagates through champions and leaves the undecidable alone", () => {
    expect(kinds.coven).toBe("origin");
    expect(kinds.defender).toBe("class");
    expect(kinds.mystery).toBeUndefined();
  });
  it("buckets emblems: origins (craftable, then not), classes (craftable, then not), then traitless", () => {
    expect(items.map((i) => emblemGroup(i, kinds))).toEqual([0, 2, 1, 3, 4]);
  });
});
