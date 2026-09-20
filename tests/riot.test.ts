import { describe, expect, it } from "vitest";
import { analyze, compLabel, isCompletedItem, prettyId, roundToStage, toGame, type RiotGame } from "@/lib/riot/analyze";
import { parseRiotId, regionOf } from "@/lib/riot/client";
import { mergeGames } from "@/lib/riot/store";
import type { MatchDto } from "@/lib/riot/types";

describe("helpers", () => {
  it("roundToStage", () => {
    expect(roundToStage(1)).toBe("1-1");
    expect(roundToStage(4)).toBe("1-4");
    expect(roundToStage(5)).toBe("2-1");
    expect(roundToStage(11)).toBe("2-7");
    expect(roundToStage(12)).toBe("3-1");
    expect(roundToStage(20)).toBe("4-2");
  });
  it("prettyId strips set prefixes", () => {
    expect(prettyId("DA_18_Akali_AD")).toBe("Akali");
    expect(prettyId("TFT_Item_InfinityEdge")).toBe("Infinity Edge");
    expect(prettyId("DA_18_Inferno")).toBe("Inferno");
    expect(prettyId("TFT14_Jinx")).toBe("Jinx");
  });
  it("parseRiotId and regionOf", () => {
    expect(parseRiotId("Hugo #EUW")).toEqual({ gameName: "Hugo", tagLine: "EUW" });
    expect(parseRiotId("Name With Spaces#1234")).toEqual({ gameName: "Name With Spaces", tagLine: "1234" });
    expect(parseRiotId("nohash")).toBeNull();
    expect(regionOf("euw1")).toBe("europe");
    expect(regionOf("na1")).toBe("americas");
    expect(regionOf("kr")).toBe("asia");
    expect(regionOf("oc1")).toBe("sea");
  });
  it("compLabel prefers style then count", () => {
    expect(
      compLabel(
        [
          { id: "A", count: 6, style: 3 },
          { id: "B", count: 2, style: 1 },
          { id: "C", count: 4, style: 3 },
          { id: "D", count: 1, style: 0 },
        ],
        (id) => id,
      ),
    ).toBe("A 6 · C 4");
  });
  it("isCompletedItem", () => {
    const comps = new Set(["DA_Component_BFSword"]);
    expect(isCompletedItem("DA_Component_BFSword", comps)).toBe(false);
    expect(isCompletedItem("TFT_Item_Spatula", comps)).toBe(false);
    expect(isCompletedItem("DA_InfinityEdge", comps)).toBe(true);
  });
});

function match(id: string, placement: number, over: Partial<MatchDto["info"]["participants"][number]> = {}, queue = 1100, at = 1_700_000_000_000): MatchDto {
  return {
    metadata: { match_id: id, participants: ["me", "other"] },
    info: {
      game_datetime: at,
      game_length: 2000,
      queue_id: queue,
      tft_set_number: 18,
      participants: [
        {
          puuid: "me",
          placement,
          level: 8,
          last_round: 30,
          gold_left: 3,
          players_eliminated: 1,
          time_eliminated: 1800,
          total_damage_to_players: 100,
          traits: [
            { name: "DA_18_Inferno", num_units: 6, style: 3, tier_current: 2, tier_total: 3 },
            { name: "DA_18_Slayer", num_units: 2, style: 1, tier_current: 1, tier_total: 3 },
          ],
          units: [
            { character_id: "DA_18_Akali_AD", tier: 2, rarity: 0, itemNames: ["DA_InfinityEdge", "DA_Component_BFSword"] },
            { character_id: "DA_18_Ornn", tier: 2, rarity: 1, itemNames: [] },
          ],
          ...over,
        },
        { puuid: "other", placement: 9 - placement, level: 8, last_round: 30, gold_left: 0, players_eliminated: 0, time_eliminated: 1800, total_damage_to_players: 50, traits: [], units: [] },
      ],
    },
  };
}

describe("toGame", () => {
  it("extracts the player's slice", () => {
    const g = toGame(match("EUW1_1", 3), "me")!;
    expect(g.placement).toBe(3);
    expect(g.stage).toBe("5-5");
    expect(g.queueName).toBe("Ranked");
    expect(g.comp).toBe("Inferno 6 · Slayer 2");
    expect(g.units[0]!.items).toEqual(["DA_InfinityEdge", "DA_Component_BFSword"]);
    expect(toGame(match("x", 1), "nobody")).toBeNull();
  });
});

describe("analyze", () => {
  const comps = new Set(["DA_Component_BFSword"]);
  const games = (placements: number[], over: (i: number) => Partial<MatchDto["info"]["participants"][number]> = () => ({})): RiotGame[] =>
    placements.map((p, i) => toGame(match(`M${i}`, p, over(i), 1100, 1_700_000_000_000 + i * 1000), "me")!);

  it("computes rates and distribution", () => {
    const r = analyze(games([1, 2, 3, 4, 5, 6, 7, 8]), { componentIds: comps });
    expect(r.games).toBe(8);
    expect(r.avg).toBe(4.5);
    expect(r.top4Rate).toBe(0.5);
    expect(r.winRate).toBe(0.125);
    expect(r.distribution).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(r.avgCompletedItemsTop4).toBe(1);
    expect(r.comps[0]!.comp).toBe("Inferno 6 · Slayer 2");
    expect(r.units.find((u) => u.id === "DA_18_Akali_AD")!.avgItems).toBe(1);
  });
  it("asks for more games below five", () => {
    const r = analyze(games([1, 2]), { componentIds: comps });
    expect(r.findings[0]!.title).toMatch(/Not enough games/);
  });
  it("flags dying with gold and under-levelled exits", () => {
    const r = analyze(
      games([8, 7, 6, 5, 8, 7, 3, 2], (i) => (i < 6 ? { gold_left: 35, level: 6, last_round: 16 } : {})),
      { componentIds: comps },
    );
    const titles = r.findings.map((f) => f.title);
    expect(titles).toContain("Dying with gold in the bank");
    expect(titles).toContain("Eliminated under-levelled");
    expect(titles).toContain("Too many 8ths");
    expect(r.findings.find((f) => f.title === "Dying with gold in the bank")!.category).toBe("econ");
    expect(r.findings.find((f) => f.title === "Dying with gold in the bank")!.guide).toBe("/guides/economy");
  });
  it("praises consistency and detects forcing", () => {
    const r = analyze(games([1, 2, 3, 4, 2, 3, 1, 4, 3, 2, 4, 3, 2, 1, 3]), { componentIds: comps });
    const titles = r.findings.map((f) => f.title);
    expect(titles).toContain("Consistent top 4");
    expect(titles.some((t) => t.includes("is your best line"))).toBe(true);
  });
  it("rankedOnly filters queues", () => {
    const all = [...games([1, 2, 3]), toGame(match("N1", 8, {}, 1090), "me")!];
    expect(analyze(all, { rankedOnly: true }).games).toBe(3);
    expect(analyze(all, { rankedOnly: false }).games).toBe(4);
  });
  it("mergeGames dedupes by match id newest first", () => {
    const a = games([1, 2]);
    const b = games([3, 4]).map((g, i) => ({ ...g, matchId: `B${i}`, at: new Date(1_800_000_000_000 + i * 1000).toISOString() }));
    b[0]!.matchId = a[1]!.matchId;
    const m = mergeGames(a, b);
    expect(m.length).toBe(3);
    expect(m[0]!.at >= m[1]!.at).toBe(true);
  });
});
