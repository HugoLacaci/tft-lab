import { CURRENT_SET } from "@/lib/current-set";
import type { Cost } from "@/lib/costs";

/**
 * Per-set game constants. One file per set (data/constants/set-<n>.ts) with a
 * verifiedOn date and source URLs. `getConstants()` returns the file for the
 * live set, or the newest file we have when the live set has no file yet
 * (flagged with `stale: true` so tables can say so).
 */
export interface SetConstants {
  setNumber: number;
  verifiedOn: string; // ISO date
  sources: {
    shopOdds: string;
    poolSize: string;
    interest: string;
    xp: string;
    augments: string;
  };
  /** Shop odds per level, cost 1..5, percent. */
  shopOdds: { level: number; odds: [number, number, number, number, number] }[];
  /** Copies of each champion in the shared pool. */
  poolSize: Record<Cost, number>;
  /** Distinct champions per cost this set. */
  distinctChampions: Record<Cost, number>;
  interest: { per: number; cap: number };
  baseIncome: number;
  /** Extra gold by streak length (win or loss). */
  streakGold: { streak: string; gold: number }[];
  xpToLevel: { level: number; xp: number }[];
  passiveXp: number;
  xpPerPurchase: { xp: number; gold: number };
  standardTimings: Record<number, string>;
  augmentRounds: string[];
  /** How many units on board per level (equals level). */
  notes?: string[];
}

import set18 from "./set-18";

const FILES: SetConstants[] = [set18];

export function getConstants(setNumber: number = CURRENT_SET.setNumber): SetConstants & { stale: boolean } {
  const exact = FILES.find((f) => f.setNumber === setNumber);
  if (exact) return { ...exact, stale: false };
  const newest = [...FILES].sort((a, b) => b.setNumber - a.setNumber)[0]!;
  return { ...newest, stale: true };
}
