import fs from "node:fs";
import path from "node:path";
import { CURRENT_SET } from "./current-set";
import type { Champion } from "./types";

/**
 * Summoned / granted units for the planner (content/sets/<n>/summons.json):
 * target dummies, Elderwood plants, PvE monsters. Exposed as pseudo-champions
 * with cost 1, no traits and a `summon:` id prefix.
 */
export interface SummonRow {
  id: string;
  name: string;
  role: "tank" | "bruiser" | "carry" | "caster" | "assassin" | "support";
  hp: number;
  ad: number;
  armor: number;
  mr: number;
  range: number;
  attackSpeed: number;
  abilityDesc?: string;
  note?: string;
  estimated: boolean;
}

export function isSummonId(id: string): boolean {
  return id.startsWith("summon:");
}

let cached: Champion[] | undefined;
export function loadSummons(): Champion[] {
  if (cached) return cached;
  const f = path.join(process.cwd(), "content", "sets", String(CURRENT_SET.setNumber), "summons.json");
  if (!fs.existsSync(f)) {
    cached = [];
    return cached;
  }
  const rows = (JSON.parse(fs.readFileSync(f, "utf8")) as { summons: SummonRow[] }).summons;
  cached = rows.map((r) => ({
    id: r.id,
    name: r.name,
    cost: 1,
    traits: [],
    icon: `/assets/generic/${r.role}.svg`,
    stats: { hp: r.hp, ad: r.ad, armor: r.armor, mr: r.mr, range: r.range, mana: 0, initialMana: 0, attackSpeed: r.attackSpeed, critChance: 0, critMultiplier: 1.4 },
    ability: { name: r.abilityDesc ? "Summon ability" : "", desc: [r.abilityDesc, r.note, r.estimated ? "Stats are estimates: Riot does not ship numbers for this unit." : ""].filter(Boolean).join(" "), icon: "", scaling: { ad: false, ap: false }, rich: "" },
  }));
  return cached;
}
