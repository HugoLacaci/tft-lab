/**
 * Item roles for grouping the catalogue: tank, mage, physical, bruiser,
 * hybrid, utility. Riot ships no such field, so it is derived:
 *
 *   - a completed item takes it from its two components (Sword / Bow /
 *     Gloves = physical, Rod / Tear = mage, Vest / Cloak / Belt = tank;
 *     offence + defence = bruiser, physical + mage = hybrid, Spatula or
 *     Frying Pan = utility),
 *   - a component from its own name,
 *   - anything without a recipe (artifacts, radiant, support…) from its
 *     stat effects, with the same reading.
 */
export type ItemRole = "tank" | "mage" | "physical" | "bruiser" | "hybrid" | "utility";

export const ROLE_ORDER: ItemRole[] = ["tank", "mage", "physical", "bruiser", "hybrid", "utility"];

export const ROLE_LABEL: Record<ItemRole, string> = {
  tank: "Tank",
  mage: "Mage",
  physical: "Physical damage",
  bruiser: "Bruiser",
  hybrid: "Hybrid",
  utility: "Utility",
};

/**
 * Component axes: P physical (Sword, Bow, Gloves), M magic (Rod), U mana
 * (Tear), R resists (Vest, Cloak), H health (Belt), E emblem (Spatula, Pan).
 *
 *   P+P, P+R          physical      (Infinity Edge, Bloodthirster, Titan's…)
 *   P+H               bruiser       (Sterak's, Nashor's, Striker's Flail…)
 *   P+M, P+U          hybrid        (Gunblade, Guinsoo's, Shojin, Hand of Justice…)
 *   M+anything else   mage          (Rabadon's, Morello, Crownguard, Ionic Spark…)
 *   U+U               mage          (Blue Buff)
 *   U+R, U+H, R/H+R/H tank          (Protector's Vow, Redemption, Warmog's…)
 *   E+anything        utility       (emblems, Tactician's items)
 */
type Axis = "P" | "M" | "U" | "R" | "H" | "E";

const COMPONENT_AXIS: Record<string, Axis> = {
  "b.f. sword": "P",
  "recurve bow": "P",
  "sparring gloves": "P",
  "needlessly large rod": "M",
  "tear of the goddess": "U",
  "chain vest": "R",
  "negatron cloak": "R",
  "giant's belt": "H",
  spatula: "E",
  "frying pan": "E",
};

function axisOfName(name: string | undefined): Axis | undefined {
  return name ? COMPONENT_AXIS[name.trim().toLowerCase()] : undefined;
}

function roleOfAxes(a: Axis, b: Axis): ItemRole {
  const has = (x: Axis) => a === x || b === x;
  if (has("E")) return "utility";
  if (has("P")) {
    if (has("M") || has("U")) return "hybrid";
    if (has("H")) return "bruiser";
    return "physical"; // P+P, P+R
  }
  if (has("M")) return "mage"; // M+M, M+U, M+R, M+H
  if (a === "U" && b === "U") return "mage";
  return "tank"; // U+R, U+H, R+R, R+H, H+H
}

/** Same reading from stat effects, for items without a recipe. */
export function roleOfEffects(e: Record<string, number>): ItemRole {
  const n = (k: string) => e[k] ?? 0;
  const phys = n("AD") * 100 + n("AS") + n("CritChance") + n("AD_NotStatBar") * 100;
  const magic = n("AP") + n("AP_NotStatBar") + n("ManaRegen") * 5 + n("Mana") / 10;
  const hp = n("Health") > 0 || n("PercentMaxHP") > 0 || n("BonusPercentHP") > 0;
  const res = n("Armor") > 0 || n("MagicResist") > 0;
  if (phys <= 0 && magic <= 0) return hp || res ? "tank" : "utility";
  if (magic > phys) return "mage";
  if (phys > magic) return hp ? "bruiser" : "physical";
  return "hybrid";
}

export interface RoleItem {
  kind: string;
  name: string;
  composition: string[];
  effects: Record<string, number>;
}

/** `componentName` resolves a composition id to the component's display name. */
export function itemRole(item: RoleItem, componentName: (id: string) => string | undefined): ItemRole {
  if (item.kind === "component") {
    const a = axisOfName(item.name);
    return a === "P" ? "physical" : a === "M" || a === "U" ? "mage" : a === "R" || a === "H" ? "tank" : "utility";
  }
  if (item.composition.length === 2) {
    const a = axisOfName(componentName(item.composition[0]!));
    const b = axisOfName(componentName(item.composition[1]!));
    if (a && b) return roleOfAxes(a, b);
  }
  return roleOfEffects(item.effects);
}
