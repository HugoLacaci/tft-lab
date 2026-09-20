import type { Cost, TraitStyle } from "./costs";
export type { Cost, TraitStyle };

/** Normalised, upstream-independent set data. The UI only ever sees these. */

export interface Champion {
  id: string; // upstream apiName (prefix varies per set)
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
    /** Attacks per second at 1★ (0 when the upstream lacks it). */
    attackSpeed: number;
    /** 0..1 */
    critChance: number;
    critMultiplier: number;
  };
  ability: {
    name: string;
    desc: string;
    icon: string;
    /** Which stats the ability text scales with (from %i:scaleAD% / %i:scaleAP% tokens). */
    scaling: { ad: boolean; ap: boolean };
    /** Same as desc but stat-icon tokens are kept as [[AD]] / [[AP]] / [[HP]] … markers for the UI. */
    rich: string;
  };
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
  | "charm"
  | "other";

export interface Item {
  id: string;
  name: string;
  desc: string;
  icon: string;
  composition: string[]; // component ids, empty for components
  kind: ItemKind;
  /** Numeric effect values as shipped upstream (AD is a fraction, AP/Armor flat, AS in %). Empty when unknown. */
  effects: Record<string, number>;
  /** Trait ids an emblem grants. */
  associatedTraits: string[];
  /** desc with stat-icon markers kept ([[AD]] …). */
  rich: string;
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
