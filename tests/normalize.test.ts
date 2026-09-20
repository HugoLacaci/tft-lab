import { describe, expect, it } from "vitest";
import fixture from "./fixtures/cdragon-sample.json";
import { RawCdragon } from "@/lib/sync/schema";
import { detectLiveSet } from "@/lib/sync/detect";
import {
  classifyItem,
  collectIconPaths,
  normalizeCdragon,
  rewriteIcons,
  tierFromIcon,
} from "@/lib/sync/normalize-cdragon";
import { renderDesc } from "@/lib/text";

const raw = RawCdragon.parse(fixture);

describe("schema", () => {
  it("accepts the real fixture", () => {
    expect(raw.setData.length).toBe(4);
  });
  it("rejects a drifted champion (missing apiName)", () => {
    const broken = structuredClone(fixture) as { setData: { champions: Record<string, unknown>[] }[] };
    delete broken.setData[2]!.champions[0]!.apiName;
    expect(RawCdragon.safeParse(broken).success).toBe(false);
  });
});

describe("detectLiveSet", () => {
  it("picks the highest number and skips PAIRS/PVE variants", () => {
    const d = detectLiveSet(raw.setData);
    expect(d.entry.number).toBe(18);
    expect(d.entry.mutator).toBe("TFTSet18");
    expect(d.candidates).toContain("TFTSet18_PAIRS");
  });
  it("prefers a stage mutator when present", () => {
    const withStage = [...raw.setData, { ...raw.setData[2]!, mutator: "TFTSet18_Stage2" }];
    expect(detectLiveSet(withStage).entry.mutator).toBe("TFTSet18_Stage2");
  });
});

describe("normalizeCdragon", () => {
  const entry = detectLiveSet(raw.setData).entry;
  const data = normalizeCdragon(entry, raw.items, { patch: "16.18", syncedAt: "2026-09-20T00:00:00.000Z" });

  it("drops non-playable units (dummies, armory keys)", () => {
    const ids = data.champions.map((c) => c.id);
    expect(ids).not.toContain("TFT_TrainingDummy");
    expect(ids).not.toContain("TFT_ArmoryKeyCompleted");
    expect(ids).toContain("DA_Sentinel18");
  });
  it("maps champion trait NAMES to trait ids", () => {
    const sentinel = data.champions.find((c) => c.id === "DA_Sentinel18")!;
    expect(sentinel.traits).toEqual(["DA_Riftbeast18", "DA_18_Vanguard", "DA_18_Invoker"]);
    expect(sentinel.cost).toBe(4);
    expect(sentinel.stats.hp).toBe(1300);
    expect(sentinel.icon).toBe("assets/characters/tft18_sentinel/tft18_sentinel_square.tex");
  });
  it("builds trait breakpoints with style names", () => {
    const vanguard = data.traits.find((t) => t.id === "DA_18_Vanguard")!;
    expect(vanguard.breakpoints.length).toBeGreaterThan(0);
    expect(vanguard.breakpoints[0]!.style).toBe("bronze");
    const unique = data.traits.find((t) => t.name === "Avatar")!;
    expect(unique.breakpoints[0]!.style).toBe("unique");
    expect(unique.breakpoints[0]!.units).toBe(1);
  });
  it("skips a breakpoint with null minUnits (Eclipse)", () => {
    const eclipse = data.traits.find((t) => t.name === "Eclipse")!;
    expect(eclipse.breakpoints.length).toBe(0);
  });
  it("dedupes items by name, keeping the family used by the set's compositions", () => {
    const names = data.items.map((i) => i.name);
    expect(names.filter((n) => n === "B.F. Sword").length).toBe(1);
    expect(data.items.find((i) => i.name === "B.F. Sword")!.id).toBe("DA_Component_BFSword");
    expect(data.items.find((i) => i.name === "Infinity Edge")!.id).toBe("DA_InfinityEdge");
    expect(data.items.find((i) => i.name === "Radiant Archangel's Staff")!.id).toBe("DA_ArchangelsStaffRadiant");
  });
  it("classifies items", () => {
    const kinds = Object.fromEntries(data.items.map((i) => [i.id, i.kind]));
    expect(kinds["DA_Component_BFSword"]).toBe("component");
    expect(kinds["DA_InfinityEdge"]).toBe("completed");
    expect(kinds["DA_18_EmblemBlossom"]).toBe("emblem");
    expect(kinds["DA_Artifact_Fishbones"]).toBe("artifact");
    expect(kinds["DA_ArchangelsStaffRadiant"]).toBe("radiant");
    expect(kinds["TFT_Item_SupportKnightsVow"]).toBe("support");
    expect(kinds["DA_18_AfterShock"]).toBe("other");
  });
  it("renders item descriptions with effect values", () => {
    const bf = data.items.find((i) => i.id === "DA_Component_BFSword")!;
    expect(bf.desc).toMatch(/10% Attack Damage/);
  });
  it("derives augment tier from the hashed tag and keeps trait links", () => {
    const branching = data.augments.find((a) => a.id === "DA_18_BranchingOut")!;
    expect(branching.tier).toBe("silver");
    const blossom = data.augments.find((a) => a.id === "DA_18_BlossomTraitAugment")!;
    expect(blossom.tier).toBe("gold");
    expect(blossom.associatedTraits).toEqual(["DA_18_Blossom"]);
    const prismatic = data.augments.find((a) => a.id === "TFT11_Augment_Calltochaos")!;
    expect(prismatic.tier).toBe("prismatic");
  });
  it("rewrites icons and collects them", () => {
    const paths = collectIconPaths(data);
    expect(paths.every((p) => p.length > 0)).toBe(true);
    const local = rewriteIcons(data, (p) => `/assets/set-18/${p.split("/").pop()}`);
    expect(local.champions[0]!.icon.startsWith("/assets/set-18/")).toBe(true);
  });
});

describe("helpers", () => {
  it("tierFromIcon", () => {
    expect(tierFromIcon("assets/x/branching-out-i.tex")).toBe("silver");
    expect(tierFromIcon("assets/x/grab-bag-ii.tex")).toBe("gold");
    expect(tierFromIcon("assets/x/foo_iii.tex")).toBe("prismatic");
    expect(tierFromIcon("assets/x/missing-t2.tex")).toBeNull();
  });
  it("classifyItem uses tags before name heuristics", () => {
    expect(
      classifyItem({
        apiName: "X",
        name: "Y",
        desc: "",
        icon: "",
        isAugment: false,
        composition: [],
        associatedTraits: [],
        tags: ["{27557a09}"],
      }),
    ).toBe("support");
  });
  it("renderDesc substitutes, scales and strips markup", () => {
    expect(renderDesc("%i:scaleAD% +@AD*100@% Attack Damage", { AD: 0.10000000149011612 })).toBe("+10% Attack Damage");
    expect(renderDesc("Gain <TFTKeyword>Precision</TFTKeyword>.<br><br>{{TFT_Keyword_Precision}}")).toBe(
      "Gain Precision.\n\n[Precision]",
    );
    expect(renderDesc("Deal @Dmg@ damage", {})).toBe("Deal {Dmg} damage");
  });
});
