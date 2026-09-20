import current from "@/data/generated/current.json";
import type { CurrentSet } from "./types";

/**
 * The live set, as written by scripts/sync-set.ts. Never hardcode a set number
 * anywhere else; derive from this.
 */
export const CURRENT_SET: CurrentSet = current as CurrentSet;

export function isSynced(): boolean {
  return CURRENT_SET.setNumber > 0;
}

export function setLabel(): string {
  return isSynced() ? `Set ${CURRENT_SET.setNumber}` : "No set data";
}
