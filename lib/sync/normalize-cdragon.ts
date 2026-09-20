import { isCost } from "../costs";
import type { Augment, AugmentTier, Champion, Item, ItemKind, SetData, SetMeta, Trait, TraitBreakpoint, TraitStyle } from "../types";
import { renderDesc, traitRows } from "../text";
import type { RawCdItemT, RawCdSetEntryT, RawCdChampionT, RawCdTraitT } from "./schema";

/**
 * CDragon → normalised. Pure: takes the chosen set entry + the global items
 * array, returns SetData with icons still as UPSTREAM paths. The caller
 * (scripts/sync-set.ts) mirrors the assets and rewrites `icon` fields with
 * `rewriteIcons`.
 *
 * Every heuristic below is documented in docs/cdragon-schema.md with the
 * evidence it was derived from.
 */

/** Trait `style` ints observed: 1,3,4,5,6. See docs/cdragon-schema.md §Traits. */
export const STYLE_MAP: Record<number, TraitStyle> = {
  1: "bronze",
  2: "silver",
  3: "silver",
  4: "unique",
  5: "gold",
  6: "prismatic",
};

/**
 * Augment tier is not a field; it is one of three hashed tags. Derived by
 * correlating tags with the -i/-ii/-iii icon suffix over 592 augments.
 */
export const TIER_TAGS: Record<string, AugmentTier> = {
  "{d11fd6d5}": "silver",
  "{ce1fd21c}": "gold",
  "{cf1fd3af}": "prismatic",
};

/** Item classification tags observed on Set 18 items. */
export const ITEM_TAGS = {
  emblem: "{ebcd1bac}",
  artifact: "{44ace175}",
  radiant: "{6ef5c598}",
  support: "{27557a09}",
  component: "component",
} as const;

export interface NormalizeOptions {
  patch: string;
  syncedAt: string;
}

export function normalizeCdragon(entry: RawCdSetEntryT, allItems: RawCdItemT[], opts: NormalizeOptions): SetData {
  const traits = entry.traits.map(normalizeTrait);
  const traitIdByName = new Map(traits.map((t) => [t.name, t.id]));
  const traitIdSet = new Set(traits.map((t) => t.id));

  const champions = entry.champions
    .filter(isPlayable)
    .map((c) => normalizeChampion(c, traitIdByName))
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  const byApi = new Map(allItems.map((i) => [i.apiName, i]));
  const rawItems = entry.items.map((id) => byApi.get(id)).filter((i): i is RawCdItemT => !!i && !i.isAugment);
  const items = dedupeItems(rawItems.map(normalizeItem).filter((i) => i.name.length > 0 && i.icon.length > 0));

  const rawAugs = entry.augments.map((id) => byApi.get(id)).filter((i): i is RawCdItemT => !!i && i.isAugment);
  const augments = rawAugs
    .map((a) => normalizeAugment(a, traitIdSet))
    .filter((a) => a.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const meta: SetMeta = {
    number: entry.number,
    name: entry.name,
    mutator: entry.mutator,
    syncedAt: opts.syncedAt,
    patch: opts.patch,
    source: "cdragon",
  };
  return { meta, champions, traits, items, augments };
}

/** Playable = shop-purchasable: cost 1–5 and at least one trait. PvE monsters have no traits; armory keys are cost 8. */
export function isPlayable(c: RawCdChampionT): boolean {
  return isCost(c.cost) && c.traits.length > 0 && !!c.name;
}

export function championIconPath(c: RawCdChampionT): string {
  const cands = [c.tileIcon, c.squareIcon, c.icon].filter((p): p is string => !!p && p !== "None");
  if (cands.length === 0) throw new Error(`champion ${c.apiName} has no icon path`);
  return cands[0]!;
}

function normalizeChampion(c: RawCdChampionT, traitIdByName: Map<string, string>): Champion {
  const vars: Record<string, number | null> = {};
  for (const v of c.ability.variables ?? []) {
    const arr = v.value ?? [];
    // value[] is indexed by star level (0 = base, 1..3); use 1★ when present.
    const val = arr[1] ?? arr[0] ?? null;
    vars[v.name] = val;
  }
  const traits = c.traits.map((name) => traitIdByName.get(name) ?? name);
  return {
    id: c.apiName,
    name: c.name ?? c.apiName,
    cost: c.cost as Champion["cost"],
    traits,
    icon: championIconPath(c),
    stats: {
      hp: c.stats.hp ?? 0,
      ad: c.stats.damage ?? 0,
      armor: c.stats.armor ?? 0,
      mr: c.stats.magicResist ?? 0,
      range: c.stats.range ?? 0,
      mana: c.stats.mana ?? 0,
      initialMana: c.stats.initialMana ?? 0,
    },
    ability: {
      name: c.ability.name ?? "",
      desc: renderDesc(c.ability.desc, vars),
      icon: c.ability.icon && c.ability.icon !== "None" ? c.ability.icon : "",
    },
  };
}

function normalizeTrait(t: RawCdTraitT): Trait {
  const { intro, rows } = traitRows(t.desc);
  const breakpoints: TraitBreakpoint[] = [];
  const effects = t.effects.filter((e) => typeof e.minUnits === "number" && e.minUnits > 0);
  effects.forEach((e, i) => {
    const style = STYLE_MAP[e.style] ?? "bronze";
    const rowRaw = rows[i] ?? rows[rows.length - 1] ?? "";
    breakpoints.push({
      units: e.minUnits as number,
      style,
      desc: renderDesc(rowRaw, { MinUnits: e.minUnits, ...(e.variables ?? {}) }),
    });
  });
  return {
    id: t.apiName,
    name: t.name,
    desc: renderDesc(intro, {}),
    icon: t.icon,
    breakpoints,
  };
}

export function classifyItem(i: RawCdItemT): ItemKind {
  const tags = new Set(i.tags);
  const id = i.apiName;
  if (tags.has(ITEM_TAGS.component)) return "component";
  if (tags.has(ITEM_TAGS.emblem) || /Emblem/i.test(id) || /\bEmblem$/i.test(i.name ?? "")) return "emblem";
  if (tags.has(ITEM_TAGS.radiant) || /Radiant$/i.test(id)) return "radiant";
  if (tags.has(ITEM_TAGS.artifact) || /Artifact|_Ornn/i.test(id)) return "artifact";
  if (tags.has(ITEM_TAGS.support)) return "support";
  if (i.composition.length >= 2) return "completed";
  return "other";
}

function normalizeItem(i: RawCdItemT): Item {
  return {
    id: i.apiName,
    name: (i.name ?? "").trim(),
    desc: renderDesc(i.desc, i.effects ?? {}),
    icon: i.icon ?? "",
    composition: i.composition,
    kind: classifyItem(i),
  };
}

/**
 * The set's item list carries duplicates from earlier sets (TFT_Item_BFSword
 * and DA_Component_BFSword both appear). Keep the family the set's completed
 * items are actually built from:
 *   1. canonical component ids = every id referenced by any composition;
 *   2. among items sharing a name, score = 2 if all composition ids are
 *      canonical + 1 if the id prefix matches the canonical family; keep max,
 *      first on tie;
 *   3. items with distinct names are never merged (e.g. "X" / "X_Upgrade" pairs
 *      keep both ids).
 */
export function dedupeItems(items: Item[]): Item[] {
  const referenced = new Set(items.flatMap((i) => i.composition));
  const family = mostCommonPrefix([...referenced]);
  const byName = new Map<string, Item[]>();
  for (const it of items) {
    const key = it.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(it);
  }
  const out: Item[] = [];
  for (const group of byName.values()) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }
    const scored = group.map((it, idx) => ({
      it,
      idx,
      score:
        (it.composition.length > 0 && it.composition.every((c) => referenced.has(c)) ? 2 : 0) +
        (family && it.id.startsWith(`${family}_`) ? 1 : 0) +
        (it.kind === "component" && referenced.has(it.id) ? 2 : 0),
    }));
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
    // Keep the winner, plus any losers that have a different kind (real distinct items).
    let winner = scored[0]!.it;
    // The canonical copy sometimes ships without a description (DA_Component_* do); borrow it.
    if (!winner.desc) {
      const donor = scored.slice(1).find((s) => s.it.desc && s.it.kind === winner.kind);
      if (donor) winner = { ...winner, desc: donor.it.desc };
    }
    out.push(winner);
    for (const s of scored.slice(1)) if (s.it.kind !== winner.kind && s.it.kind === "other") out.push(s.it);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function mostCommonPrefix(ids: string[]): string | null {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const p = id.split("_")[0]!;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [p, c] of counts) {
    if (c > n) {
      best = p;
      n = c;
    }
  }
  return best;
}

function normalizeAugment(a: RawCdItemT, traitIds: Set<string>): Augment {
  let tier: AugmentTier | undefined;
  for (const t of a.tags) if (TIER_TAGS[t]) tier = TIER_TAGS[t];
  if (!tier) tier = tierFromIcon(a.icon ?? "") ?? "silver";
  return {
    id: a.apiName,
    name: (a.name ?? "").trim(),
    desc: renderDesc(a.desc, a.effects ?? {}),
    icon: a.icon ?? "",
    tier,
    associatedTraits: a.associatedTraits.filter((t) => traitIds.has(t)),
  };
}

export function tierFromIcon(icon: string): AugmentTier | null {
  const m = icon.toLowerCase().match(/[-_](i{1,3})\.(tex|dds|png)$/);
  if (!m) return null;
  return ({ i: "silver", ii: "gold", iii: "prismatic" } as const)[m[1] as "i" | "ii" | "iii"];
}

/** Replace every upstream icon path with the result of `map`. */
export function rewriteIcons(data: SetData, map: (upstreamPath: string) => string): SetData {
  const f = (p: string) => (p ? map(p) : "");
  return {
    ...data,
    champions: data.champions.map((c) => ({ ...c, icon: f(c.icon), ability: { ...c.ability, icon: f(c.ability.icon) } })),
    traits: data.traits.map((t) => ({ ...t, icon: f(t.icon) })),
    items: data.items.map((i) => ({ ...i, icon: f(i.icon) })),
    augments: data.augments.map((a) => ({ ...a, icon: f(a.icon) })),
  };
}

/** All distinct upstream icon paths referenced by a SetData. */
export function collectIconPaths(data: SetData): string[] {
  const s = new Set<string>();
  for (const c of data.champions) {
    s.add(c.icon);
    if (c.ability.icon) s.add(c.ability.icon);
  }
  for (const t of data.traits) s.add(t.icon);
  for (const i of data.items) s.add(i.icon);
  for (const a of data.augments) s.add(a.icon);
  s.delete("");
  return [...s];
}
