/**
 * Origin vs class per trait. CommunityDragon ships no such flag, so it is
 * inferred: an emblem crafted with a Spatula marks an origin, one crafted
 * with a Frying Pan marks a class, and the rest follows from the champions
 * (every unit has at least one origin and one class, so a champion whose
 * only unclassified trait sits next to a known origin and no class has a
 * class there, and vice versa). Traits that never settle are left out.
 */
export type TraitKind = "origin" | "class";

export interface TraitKindItem {
  kind: string;
  composition: string[];
  associatedTraits: string[];
}

export function inferTraitKinds(champions: { traits: string[] }[], items: TraitKindItem[], componentName: (id: string) => string | undefined): Record<string, TraitKind> {
  const kinds: Record<string, TraitKind> = {};
  for (const i of items) {
    if (i.kind !== "emblem" || !i.associatedTraits[0]) continue;
    const names = i.composition.map((c) => (componentName(c) ?? "").toLowerCase());
    if (names.includes("spatula")) kinds[i.associatedTraits[0]] = "origin";
    else if (names.includes("frying pan")) kinds[i.associatedTraits[0]] = "class";
  }
  for (let round = 0; round < 10; round++) {
    let changed = false;
    for (const c of champions) {
      const unknown = c.traits.filter((t) => !kinds[t]);
      if (unknown.length !== 1) continue;
      const hasOrigin = c.traits.some((t) => kinds[t] === "origin");
      const hasClass = c.traits.some((t) => kinds[t] === "class");
      if (hasOrigin && !hasClass) {
        kinds[unknown[0]!] = "class";
        changed = true;
      } else if (hasClass && !hasOrigin) {
        kinds[unknown[0]!] = "origin";
        changed = true;
      }
    }
    if (!changed) break;
  }
  return kinds;
}

/** Sort bucket for an emblem: origins first (Spatula, then uncraftable), then classes (Frying Pan, then uncraftable), then emblems without a trait. */
export function emblemGroup(item: TraitKindItem, kinds: Record<string, TraitKind>): number {
  const trait = item.associatedTraits[0];
  const kind = trait ? kinds[trait] : undefined;
  const craftable = item.composition.length > 0;
  if (kind === "origin") return craftable ? 0 : 1;
  if (kind === "class") return craftable ? 2 : 3;
  return 4;
}

export const EMBLEM_GROUP_LABEL = ["Origin emblems · Spatula", "Origin emblems · not craftable", "Class emblems · Frying Pan", "Class emblems · not craftable", "Other emblems"] as const;
