import type { Cost, TraitStyle } from "./costs";
export type { Cost, TraitStyle };

/** Normalised, upstream-independent set data. The UI only ever sees these. */

export interface Champion {
  id: string; // apiName, e.g. "TFT18_Ivern" or "DA_18_Ivern"
  name: string;
  cost: Cost;
  traits: string[]; // trait ids
  icon: string; // local path under /assets/set-N/
  stats: {
    hp: number;
    ad: number;
    armor: number;
    mr: number;
    range: number;
    mana: number;
    initialMana: number;
  };
  ability: { name: string; desc: string; icon: string };
}

export interface TraitBreakpoint {
  units: number;
  style: TraitStyle;
  desc: string;
}

export interface Trait {
  id: string;
  name: string;
  desc: string;
  icon: string;
  breakpoints: TraitBreakpoint[];
}

export type ItemKind =
  | "component"
  | "completed"
  | "emblem"
  | "artifact"
  | "radiant"
  | "support"
  | "other";

export interface Item {
  id: string;
  name: string;
  desc: string;
  icon: string;
  composition: string[]; // component ids, empty for components
  kind: ItemKind;
}

export type AugmentTier = "silver" | "gold" | "prismatic";

export interface Augment {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: AugmentTier;
  associatedTraits: string[];
}

export interface SetMeta {
  number: number;
  name: string;
  mutator: string;
  syncedAt: string;
  /** Game patch the data was read from, e.g. "16.18". */
  patch: string;
  /** Which upstream produced the data. */
  source: "cdragon" | "ddragon";
}

export interface SetData {
  meta: SetMeta;
  champions: Champion[];
  traits: Trait[];
  items: Item[];
  augments: Augment[];
}

/** data/generated/current.json */
export interface CurrentSet {
  setNumber: number;
  setName: string;
  mutator: string;
  syncedAt: string;
  patch: string;
}
