import type { UnitLookup, ItemLookup } from "@/lib/set-data";
import type { Cost } from "@/lib/costs";

/**
 * Generic unit archetypes for set-agnostic scenarios. Ids are
 * "generic:<role>-<cost>". They render with a role glyph and the cost ring,
 * so a scenario written today still makes sense three sets from now.
 */
export const ROLES = ["tank", "bruiser", "carry", "caster", "assassin", "support"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  tank: "Tank",
  bruiser: "Bruiser",
  carry: "AD Carry",
  caster: "AP Carry",
  assassin: "Assassin",
  support: "Utility",
};

const ROLE_DESC: Record<Role, string> = {
  tank: "Frontline. Holds the line, wants defensive items.",
  bruiser: "Frontline damage. Fights in melee, wants HP and sustain.",
  carry: "Backline auto-attacker. Wants AD, attack speed, crit.",
  caster: "Backline spell damage. Wants AP, mana, penetration.",
  assassin: "Jumps to the backline at combat start.",
  support: "Utility: shields, heals, crowd control or buffs.",
};

export const GENERIC_UNITS: Record<string, UnitLookup> = {};
for (const role of ROLES) {
  for (const cost of [1, 2, 3, 4, 5] as Cost[]) {
    const id = `generic:${role}-${cost}`;
    GENERIC_UNITS[id] = {
      id,
      name: `${cost}-cost ${ROLE_LABEL[role]}`,
      cost,
      icon: `/assets/generic/${role}.svg`,
      traits: [],
      ability: { name: ROLE_LABEL[role], desc: ROLE_DESC[role] },
    };
  }
}

/** Generic item slots for set-agnostic boards: "generic:item:<slug>". */
export const GENERIC_ITEMS: Record<string, ItemLookup> = {
  "generic:item:ad": { id: "generic:item:ad", name: "AD component", icon: "/assets/generic/carry.svg", kind: "component" },
  "generic:item:ap": { id: "generic:item:ap", name: "AP component", icon: "/assets/generic/caster.svg", kind: "component" },
  "generic:item:tank": { id: "generic:item:tank", name: "Defensive component", icon: "/assets/generic/tank.svg", kind: "component" },
  "generic:item:carry-completed": { id: "generic:item:carry-completed", name: "Completed carry item", icon: "/assets/generic/carry.svg", kind: "completed" },
  "generic:item:tank-completed": { id: "generic:item:tank-completed", name: "Completed tank item", icon: "/assets/generic/tank.svg", kind: "completed" },
  "generic:item:emblem": { id: "generic:item:emblem", name: "Emblem", icon: "/assets/generic/support.svg", kind: "emblem" },
};

export function isGenericId(id: string): boolean {
  return id.startsWith("generic:");
}
