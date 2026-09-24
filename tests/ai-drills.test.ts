import { describe, expect, it } from "vitest";
import { filterDrills, type Catalogue } from "@/lib/ai-drills";

const cat: Catalogue = {
  setNumber: 18,
  units: {
    "DA_18_Leona": { id: "DA_18_Leona", name: "Leona", cost: 1, icon: "/x.png", traits: [] },
    "DA_18_Varus": { id: "DA_18_Varus", name: "Varus", cost: 1, icon: "/x.png", traits: [] },
  },
  items: { DA_InfinityEdge: { id: "DA_InfinityEdge", name: "Infinity Edge", icon: "/i.png", kind: "completed" } },
  traitNames: {},
  guideAnchors: ["/guides/positioning#frontline-and-backline-defaults"],
};

const good = {
  id: "ai-varus-back",
  category: "positioning",
  difficulty: 1,
  kind: "drill",
  setAgnostic: false,
  set: 18,
  prompt: "Stage 2-3, level 4. Where does Varus go so he shoots before he is reached?",
  state: {
    stage: "2-3",
    gold: 10,
    hp: 90,
    level: 4,
    xpToNext: 4,
    streak: { type: "win", count: 1 },
    board: [{ championId: "DA_18_Leona", row: 0, col: 3, star: 2, items: [] }],
    bench: [],
    shop: [null, null, null, null, null],
    items: [],
  },
  question: { type: "placement", unitId: "DA_18_Varus", correctHexes: [{ row: 3, col: 3 }] },
  explanation: "Ranged units want the back row: they start attacking at once while the enemy walks through Leona first, so the damage keeps happening.",
  principle: "Tanks front, carries back.",
  guideLink: "/guides/positioning#frontline-and-backline-defaults",
  hint: "Which row does an enemy melee unit reach last?",
};

describe("filterDrills", () => {
  it("keeps valid drills, drops unknown ids, wrong sets and augment questions, and dedupes ids", () => {
    const { drills, dropped } = filterDrills(
      [
        good,
        { ...good, id: "ai-varus-back" }, // duplicate id → renamed, kept
        { ...good, state: { ...good.state, board: [{ championId: "DA_18_Nope", row: 0, col: 3, star: 2, items: [] }] } },
        { ...good, setAgnostic: true, set: undefined },
        { ...good, question: { type: "augment", options: ["a", "b"], correct: "a" } },
        { ...good, prompt: "short" },
        { ...good, guideLink: "/guides/economy#not-in-list" },
      ],
      cat,
    );
    expect(drills.map((d) => d.id)).toEqual(["ai-varus-back", "ai-varus-back-2", "ai-varus-back-2-2"]);
    expect(drills[2]!.guideLink).toBe(cat.guideAnchors[0]);
    expect(dropped).toHaveLength(4);
    expect(dropped.join("\n")).toMatch(/unknown id DA_18_Nope/);
    expect(dropped.join("\n")).toMatch(/not written for the live set/);
    expect(dropped.join("\n")).toMatch(/augment questions/);
  });
});
