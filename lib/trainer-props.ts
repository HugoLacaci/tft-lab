import type { ReactNode } from "react";
import type { Scenario } from "./scenario-schema";
import type { ItemLookup, UnitLookup } from "./set-data";
import type { AugmentTier } from "./types";

/** Serialisable lookups the client session needs. */
export interface AugmentCard {
  id: string;
  name: string;
  tier: AugmentTier;
  desc: string;
  icon: string;
}

export interface SessionData {
  scenarios: Scenario[];
  units: Record<string, UnitLookup>;
  items: Record<string, ItemLookup>;
  traitNames: Record<string, string>;
  augments: Record<string, AugmentCard>;
  xpNeeded: Record<number, number>;
}

/** Pre-rendered markdown per scenario (server → client as ReactNode props). */
export interface Rendered {
  explanation: ReactNode;
  explainMore: ReactNode | null;
}
