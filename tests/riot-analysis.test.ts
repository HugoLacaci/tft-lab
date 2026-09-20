import { describe, expect, it } from "vitest";
import { analyze, expectedLevel, focusFromScores, reviewGame, toGame, type RiotGame } from "@/lib/riot/analyze";
import { buildExercises } from "@/lib/riot/exercises";
import type { MatchDto, ParticipantDto } from "@/lib/riot/types";

function participant(puuid: string, placement: number, over: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    puuid,
    placement,
    level: 8,
    last_round: 30,
    gold_left: 3,
    players_eliminated: 1,
    time_eliminated: 1800,
    total_damage_to_players: 100,
    traits: [{ name: "DA_18_Inferno", num_units: 6, style: 3, tier_current: 2, tier_total: 3 }],
    units: [
      { character_id: "DA_18_Akali_AD", tier: 2, rarity: 0, itemNames: ["DA_InfinityEdge", "DA_Bloodthirster", "DA_GuinsoosRageblade"] },
      { character_id: "DA_18_Ornn", tier: 2, rarity: 1, itemNames: ["DA_WarmogsArmor"] },
      { character_id: "DA_18_Karma", tier: 1, rarity: 1, itemNames: [] },
    ],
    ...over,
  };
}

function match(id: string, me: Partial<ParticipantDto>, others: Partial<ParticipantDto>[] = [], at = 1_700_000_000_000): MatchDto {
  const parts = [participant("me", me.placement ?? 4, me)];
  for (let i = 0; i < 7; i++) parts.push(participant(`p${i}`, i + 1 >= (me.placement ?? 4) ? i + 2 : i + 1, others[i] ?? {}));
  return { metadata: { match_id: id, participants: parts.map((p) => p.puuid) }, info: { game_datetime: at, game_length: 2000, queue_id: 1100, tft_set_number: 18, participants: parts } };
}

const comps = new Set(["DA_Component_BFSword"]);
const ctx = { componentIds: comps, unitName: (id: string) => id.replace(/^DA_18_/, "").replace(/_AD$/, ""), traitName: (id: string) => id.replace(/^DA_18_/, "") };

describe("expectedLevel", () => {
  it("follows the standard timings", () => {
    expect(expectedLevel(12)).toBe(6); // 3-1
    expect(expectedLevel(19)).toBe(7); // 4-1
    expect(expectedLevel(23)).toBe(8); // 4-5
    expect(expectedLevel(33)).toBe(9); // 5-7
  });
});

describe("toGame with lobby", () => {
  it("keeps a compact lobby and unit costs", () => {
    const g = toGame(match("M1", { placement: 3 }), "me", { componentIds: comps, unitCost: (id) => (id.includes("Akali") ? 1 : undefined) })!;
    expect(g.lobby!.length).toBe(7);
    expect(g.lobby![0]!.placement).toBe(1);
    expect(g.lobby![0]!.completedItems).toBe(4);
    expect(g.lobby![0]!.twoStars).toBe(2);
    expect(g.units[0]!.cost).toBe(1);
    expect(g.units[1]!.cost).toBeUndefined();
  });
});

describe("scores and focus", () => {
  it("scores eight dimensions and derives focus from the weak ones", () => {
    const games: RiotGame[] = [];
    for (let i = 0; i < 12; i++) {
      const bad = i % 2 === 0;
      games.push(toGame(match(`M${i}`, bad ? { placement: 7, level: 6, last_round: 22, gold_left: 40, total_damage_to_players: 20 } : { placement: 2, level: 9 }, [], 1_700_000_000_000 + i * 1000), "me", { componentIds: comps })!);
    }
    const r = analyze(games, { componentIds: comps });
    expect(r.scores.length).toBe(8);
    for (const s of r.scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
    const econ = r.scores.find((s) => s.id === "econ")!;
    expect(econ.score).toBeLessThan(50);
    expect(r.focus.econ).toBeGreaterThan(0);
    const f = focusFromScores([{ id: "econ", label: "Economy", score: 90, note: "" }]);
    expect(f.econ).toBeUndefined();
  });
});

describe("reviewGame", () => {
  it("flags gold, level and contest in a lost game", () => {
    const g = toGame(match("M9", { placement: 7, level: 6, last_round: 22, gold_left: 35 }, [{ traits: [{ name: "DA_18_Inferno", num_units: 6, style: 3, tier_current: 2, tier_total: 3 }] }, { traits: [{ name: "DA_18_Inferno", num_units: 4, style: 2, tier_current: 1, tier_total: 3 }] }]), "me", { componentIds: comps })!;
    const rv = reviewGame(g, ctx);
    expect(rv.bad.some((s) => /35 gold/.test(s))).toBe(true);
    expect(rv.bad.some((s) => /Level 6/.test(s))).toBe(true);
    expect(rv.bad.some((s) => /contested/.test(s))).toBe(true);
    expect(rv.categories).toContain("econ");
    expect(rv.categories).toContain("level-timing");
    expect(rv.compare.find((c) => c.label === "Level")!.you).toBe("6");
    expect(rv.good.some((s) => /Full carry/.test(s))).toBe(true);
  });
  it("praises a clean win", () => {
    const g = toGame(match("W1", { placement: 1, players_eliminated: 3, total_damage_to_players: 300 }), "me", { componentIds: comps })!;
    const rv = reviewGame(g, ctx);
    expect(rv.verdict).toBe("Clean win.");
    expect(rv.good.some((s) => /Eliminated 3/.test(s))).toBe(true);
  });
});

describe("buildExercises", () => {
  it("builds questions from the player's own leaks with real numbers", () => {
    const games = [
      toGame(match("E1", { placement: 8, level: 5, last_round: 16, gold_left: 30 }), "me", { componentIds: comps })!,
      toGame(match("E2", { placement: 6, level: 7, last_round: 26, gold_left: 2, units: [{ character_id: "DA_18_Akali_AD", tier: 2, rarity: 0, itemNames: [] }] }), "me", { componentIds: comps })!,
      toGame(match("E3", { placement: 2, gold_left: 40, units: [{ character_id: "DA_18_Akali_AD", tier: 1, rarity: 0, itemNames: [] }, { character_id: "DA_18_Ornn", tier: 1, rarity: 1, itemNames: [] }, { character_id: "DA_18_Karma", tier: 2, rarity: 1, itemNames: [] }] }), "me", { componentIds: comps })!,
      toGame(match("E4", { placement: 3 }), "me", { componentIds: comps })!,
      toGame(match("E5", { placement: 4 }), "me", { componentIds: comps })!,
    ];
    const r = analyze(games, { componentIds: comps });
    const ex = buildExercises(games, r, ctx);
    const ids = ex.map((e) => e.id.split(":")[0]);
    expect(ids).toContain("econ");
    expect(ids).toContain("hp");
    expect(ids).toContain("items");
    expect(ids).toContain("cap");
    for (const e of ex) {
      expect(e.options.some((o) => o.id === e.correct)).toBe(true);
      expect(e.explanation.length).toBeGreaterThan(80);
      expect(e.guide.startsWith("/guides/")).toBe(true);
    }
    const econ = ex.find((e) => e.id.startsWith("econ:"))!;
    expect(econ.prompt).toMatch(/30 gold/);
    expect(econ.correct).toBe("level");
  });
});
