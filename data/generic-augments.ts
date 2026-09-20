import type { AugmentTier } from "@/lib/types";

/**
 * Set-agnostic augment archetypes for trainer scenarios. Ids are
 * "generic:aug:<slug>". Descriptions are written to be recognisable as the
 * kind of augment that exists in every set without naming a real one.
 */
export interface GenericAugment {
  id: string;
  name: string;
  tier: AugmentTier;
  kind: "econ" | "trait" | "combat" | "item" | "tempo" | "utility";
  desc: string;
}

export const GENERIC_AUGMENTS: Record<string, GenericAugment> = Object.fromEntries(
  (
    [
      { id: "generic:aug:econ-interest", name: "Compounding Interest", tier: "silver", kind: "econ", desc: "Gain 1 extra interest per 10 gold (max +2). Pays off only if you sit above 50 gold for many rounds." },
      { id: "generic:aug:econ-lump", name: "Windfall", tier: "gold", kind: "econ", desc: "Gain 18 gold now. Nothing else. Pure tempo you can spend immediately." },
      { id: "generic:aug:econ-delayed", name: "Delayed Payout", tier: "prismatic", kind: "econ", desc: "Gain 8 gold at the start of each stage for the rest of the game. Weak now, strong if you survive to stage 6." },
      { id: "generic:aug:trait-plus-one", name: "Trait Heart", tier: "silver", kind: "trait", desc: "Your team counts as having 1 additional unit of a named trait. Only matters if you reach the next breakpoint." },
      { id: "generic:aug:trait-crest", name: "Trait Crest", tier: "gold", kind: "trait", desc: "Gain an emblem for a named trait and a unit that has it. Commits you to the vertical." },
      { id: "generic:aug:trait-crown", name: "Trait Crown", tier: "prismatic", kind: "trait", desc: "Gain an emblem, a 2-star unit of the trait and a completed item for it. Locks the whole game into that line." },
      { id: "generic:aug:combat-frontline", name: "Sturdy Frontline", tier: "silver", kind: "combat", desc: "Units in the front two rows gain 150 HP and 12 armor. A flat floor-raiser that helps any board." },
      { id: "generic:aug:combat-backline-as", name: "Backline Tempo", tier: "gold", kind: "combat", desc: "Units in the back two rows gain 20% attack speed. Scales with a real carry; does nothing for a 2-cost placeholder." },
      { id: "generic:aug:combat-scaling", name: "Late Bloomer", tier: "prismatic", kind: "combat", desc: "Your team gains 1% damage per round elapsed, starting now. Terrible at 25 HP, excellent when you are healthy and stabilised." },
      { id: "generic:aug:item-component", name: "Component Anvil", tier: "silver", kind: "item", desc: "Gain a component of your choice now. Lets you slam a completed item this round." },
      { id: "generic:aug:item-completed", name: "Item Anvil", tier: "gold", kind: "item", desc: "Gain a completed item from a choice of 4. Immediate power, no flexibility later." },
      { id: "generic:aug:item-radiant-late", name: "Radiant Promise", tier: "prismatic", kind: "item", desc: "At stage 5-1, turn one item radiant. Nothing until then." },
      { id: "generic:aug:tempo-reroll", name: "Free Rerolls", tier: "silver", kind: "tempo", desc: "Gain 1 free shop refresh per round. Best for reroll lines that stay low-level." },
      { id: "generic:aug:tempo-xp", name: "Level Up!", tier: "gold", kind: "tempo", desc: "Gain 8 XP now and 2 extra XP per round. A fast-8 augment; wasted on a level-6 reroll board." },
      { id: "generic:aug:utility-hp", name: "Second Wind", tier: "silver", kind: "utility", desc: "Heal 20 player HP over the next 4 rounds. Buys time when you are low; a wasted slot at 90 HP." },
    ] as GenericAugment[]
  ).map((a) => [a.id, a]),
);
