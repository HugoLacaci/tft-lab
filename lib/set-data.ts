import fs from "node:fs";
import path from "node:path";
import { CURRENT_SET, isSynced } from "./current-set";
import type { Augment, Champion, Item, SetData, Trait } from "./types";

/**
 * Server-side loader for the synced set. Reads data/generated/set-<n>.json
 * at build time (static export), so pages never touch upstream JSON.
 * Everything is memoised per process.
 */
let cached: SetData | null | undefined;

export function loadSetData(): SetData | null {
  if (cached !== undefined) return cached;
  if (!isSynced()) {
    cached = null;
    return cached;
  }
  const file = path.join(process.cwd(), "data", "generated", `set-${CURRENT_SET.setNumber}.json`);
  if (!fs.existsSync(file)) {
    cached = null;
    return cached;
  }
  cached = JSON.parse(fs.readFileSync(file, "utf8")) as SetData;
  return cached;
}

export function requireSetData(): SetData {
  const d = loadSetData();
  if (!d) throw new Error("Set data not synced. Run `npm run sync-set`.");
  return d;
}

export function championById(id: string): Champion | undefined {
  return loadSetData()?.champions.find((c) => c.id === id);
}
export function traitById(id: string): Trait | undefined {
  return loadSetData()?.traits.find((t) => t.id === id);
}
export function itemById(id: string): Item | undefined {
  return loadSetData()?.items.find((i) => i.id === id);
}
export function augmentById(id: string): Augment | undefined {
  return loadSetData()?.augments.find((a) => a.id === id);
}

export function championsByTrait(traitId: string): Champion[] {
  return (loadSetData()?.champions ?? []).filter((c) => c.traits.includes(traitId));
}

/** Compact lookup maps for client components (id → minimal record). */
export interface UnitLookup {
  id: string;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;
  icon: string;
  traits: string[];
  ability?: { name: string; desc: string };
}
export interface ItemLookup {
  id: string;
  name: string;
  icon: string;
  kind: Item["kind"];
}
export interface TraitLookup {
  id: string;
  name: string;
  icon: string;
}

export function unitLookup(): Record<string, UnitLookup> {
  const d = loadSetData();
  const out: Record<string, UnitLookup> = {};
  for (const c of d?.champions ?? []) {
    out[c.id] = { id: c.id, name: c.name, cost: c.cost, icon: c.icon, traits: c.traits, ability: { name: c.ability.name, desc: c.ability.desc } };
  }
  return out;
}
export function itemLookup(): Record<string, ItemLookup> {
  const d = loadSetData();
  const out: Record<string, ItemLookup> = {};
  for (const i of d?.items ?? []) out[i.id] = { id: i.id, name: i.name, icon: i.icon, kind: i.kind };
  return out;
}
export function traitLookup(): Record<string, TraitLookup> {
  const d = loadSetData();
  const out: Record<string, TraitLookup> = {};
  for (const t of d?.traits ?? []) out[t.id] = { id: t.id, name: t.name, icon: t.icon };
  return out;
}
