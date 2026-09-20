import { isCost } from "../costs";
import type { Augment, Champion, Item, SetData, SetMeta, Trait } from "../types";
import { classifyDdItem } from "./ddragon-classify";
import type { RawDdAugmentT, RawDdChampionT, RawDdItemT, RawDdTraitT } from "./schema";

/**
 * Data Dragon fallback. Lower fidelity than CDragon: no champion traits,
 * stats, abilities or trait breakpoints. The hub renders what it has; the
 * banner tells the reader the data is degraded.
 *
 * Champion keys look like "Maps/Shipping/Map22/Sets/TFTSet18/Shop/DA_18_Xayah";
 * the set number is parsed from "TFTSet<n>".
 */
export const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn";

export function ddragonImage(version: string, group: "tft-champion" | "tft-trait" | "tft-item" | "tft-augment", full: string): string {
  return `${DDRAGON_CDN}/${version}/img/${group}/${full}`;
}

export function detectSetFromDdragon(championKeys: string[]): number {
  let max = 0;
  for (const k of championKeys) {
    const m = k.match(/TFTSet(\d+)/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  if (max === 0) throw new Error("ddragon: could not detect a set number from champion keys");
  return max;
}

export function normalizeDdragon(
  version: string,
  champions: Record<string, RawDdChampionT>,
  traits: Record<string, RawDdTraitT>,
  items: Record<string, RawDdItemT>,
  augments: Record<string, RawDdAugmentT>,
  syncedAt: string,
): SetData {
  const setNumber = detectSetFromDdragon(Object.keys(champions));
  const setTag = `TFTSet${setNumber}`;
  const inSet = (key: string, id: string) => key.includes(setTag) || new RegExp(`(^|_)${setNumber}(_|$)|TFT${setNumber}_`).test(id);

  const champs: Champion[] = Object.entries(champions)
    .filter(([k, c]) => k.includes(setTag) && isCost(c.tier ?? c.cost ?? 0))
    .map(([, c]) => ({
      id: c.id,
      name: c.name,
      cost: (c.tier ?? c.cost) as Champion["cost"],
      traits: [],
      icon: ddragonImage(version, "tft-champion", c.image.full),
      stats: { hp: 0, ad: 0, armor: 0, mr: 0, range: 0, mana: 0, initialMana: 0, attackSpeed: 0, critChance: 0.25, critMultiplier: 1.4 },
      ability: { name: "", desc: "", icon: "", scaling: { ad: false, ap: false }, rich: "" },
    }))
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  const trs: Trait[] = Object.entries(traits)
    .filter(([k, t]) => inSet(k, t.id))
    .map(([, t]) => ({ id: t.id, name: t.name, desc: "", icon: ddragonImage(version, "tft-trait", t.image.full), breakpoints: [] }));

  const its: Item[] = Object.entries(items)
    .filter(([k, i]) => inSet(k, i.id) || /^TFT_Item_/.test(i.id))
    .map(([, i]) => ({
      id: i.id,
      name: i.name,
      desc: "",
      icon: ddragonImage(version, "tft-item", i.image.full),
      composition: [],
      kind: classifyDdItem(i.id, i.name),
      effects: {},
      associatedTraits: [],
      rich: "",
    }));

  const augs: Augment[] = Object.entries(augments)
    .filter(([k, a]) => inSet(k, a.id))
    .map(([, a]) => ({
      id: a.id,
      name: a.name,
      desc: a.description ?? "",
      icon: ddragonImage(version, "tft-augment", a.image.full),
      tier: tierFromDdImage(a.image.full),
      associatedTraits: [],
    }));

  const meta: SetMeta = {
    number: setNumber,
    name: `Set${setNumber}`,
    mutator: setTag,
    syncedAt,
    patch: version.split(".").slice(0, 2).join("."),
    source: "ddragon",
  };
  return { meta, champions: champs, traits: trs, items: its, augments: augs };
}

function tierFromDdImage(full: string): Augment["tier"] {
  const m = full.toLowerCase().match(/-(i{1,3})\.png$/);
  if (!m) return "silver";
  return ({ i: "silver", ii: "gold", iii: "prismatic" } as const)[m[1] as "i" | "ii" | "iii"];
}
