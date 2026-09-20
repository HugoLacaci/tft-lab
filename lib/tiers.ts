import fs from "node:fs";
import path from "node:path";
import { CURRENT_SET } from "./current-set";

/**
 * Hand-curated strength tiers per patch (content/sets/<n>/tiers.json), keyed
 * by display NAME (ids differ between item families). S best … F worst.
 */
export type Rank = "S" | "A" | "B" | "C" | "D" | "F";
export const RANKS: Rank[] = ["S", "A", "B", "C", "D", "F"];

export interface TiersFile {
  patch: string;
  verifiedOn: string;
  note: string;
  sources: string[];
  items: Record<string, Rank>;
  augments: Record<string, Rank>;
  wisps?: Record<string, Rank>;
}

let cached: TiersFile | null | undefined;
export function loadTiers(): TiersFile | null {
  if (cached !== undefined) return cached;
  const f = path.join(process.cwd(), "content", "sets", String(CURRENT_SET.setNumber), "tiers.json");
  cached = fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as TiersFile) : null;
  return cached;
}

/** Lookup by name, case-insensitive, tolerant of apostrophe/punctuation differences. */
export function rankLookup(map: Record<string, Rank>): (name: string) => Rank | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+]/g, "");
  const m = new Map(Object.entries(map).map(([k, v]) => [norm(k), v]));
  return (name) => m.get(norm(name));
}

/** Serialisable {id → rank} for client components. */
export function ranksById<T extends { id: string; name: string }>(list: T[], map: Record<string, Rank> | undefined): Record<string, Rank> {
  if (!map) return {};
  const look = rankLookup(map);
  const out: Record<string, Rank> = {};
  for (const x of list) {
    const r = look(x.name);
    if (r) out[x.id] = r;
  }
  return out;
}
