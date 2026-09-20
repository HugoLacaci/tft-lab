import type { ScenarioCategory } from "./scenario-categories";
import { readJson, writeJson } from "./storage";

/**
 * Training focus written by the tracker's Riot analysis (localStorage
 * tftlab.focus.v1) and read by the Daily 10 as extra category weights.
 */
export interface Focus {
  version: 1;
  at: string;
  weights: Partial<Record<ScenarioCategory, number>>; // 0..1
}

export const FOCUS_KEY = "tftlab.focus.v1";

export function readFocus(): Focus | null {
  const f = readJson<Focus | null>(FOCUS_KEY, null);
  return f && f.version === 1 && f.weights ? f : null;
}

export function writeFocus(weights: Partial<Record<ScenarioCategory, number>>): boolean {
  return writeJson(FOCUS_KEY, { version: 1, at: new Date().toISOString(), weights } satisfies Focus);
}

/** Element-wise max of two weight maps. */
export function mergeWeights(a: Partial<Record<ScenarioCategory, number>>, b: Partial<Record<ScenarioCategory, number>> | null | undefined): Partial<Record<ScenarioCategory, number>> {
  const out: Partial<Record<ScenarioCategory, number>> = { ...a };
  for (const [k, v] of Object.entries(b ?? {}) as [ScenarioCategory, number][]) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}
