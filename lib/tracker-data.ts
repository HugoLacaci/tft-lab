import type { ScenarioCategory } from "./scenario-categories";
import { readJson, writeJson } from "./storage";

/** Leak tracker records (localStorage key tftlab.tracker.v1). */
export interface GameLog {
  id: string;
  at: string; // ISO datetime
  placement: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  comp: string;
  leak: ScenarioCategory | "none";
  note: string;
}

export interface TrackerData {
  version: 1;
  games: GameLog[];
}

export const TRACKER_KEY = "tftlab.tracker.v1";

export function readTracker(): TrackerData {
  const d = readJson<TrackerData>(TRACKER_KEY, { version: 1, games: [] });
  if (!d || d.version !== 1 || !Array.isArray(d.games)) return { version: 1, games: [] };
  return d;
}

export function writeTracker(d: TrackerData): boolean {
  return writeJson(TRACKER_KEY, d);
}

/** Leak tag frequency over the last N games → extra weight per category for Daily 10. */
export function leakWeights(games: GameLog[], lastN = 20): Partial<Record<ScenarioCategory, number>> {
  const recent = games.slice(-lastN);
  const out: Partial<Record<ScenarioCategory, number>> = {};
  for (const g of recent) if (g.leak !== "none") out[g.leak] = (out[g.leak] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(out));
  for (const k of Object.keys(out) as ScenarioCategory[]) out[k] = out[k]! / max;
  return out;
}

export function averagePlacement(games: GameLog[]): number | null {
  if (!games.length) return null;
  return games.reduce((a, g) => a + g.placement, 0) / games.length;
}

export function rollingAverage(games: GameLog[], window = 20): { index: number; avg: number }[] {
  const out: { index: number; avg: number }[] = [];
  for (let i = 0; i < games.length; i++) {
    const slice = games.slice(Math.max(0, i - window + 1), i + 1);
    out.push({ index: i + 1, avg: slice.reduce((a, g) => a + g.placement, 0) / slice.length });
  }
  return out;
}

export function placementDistribution(games: GameLog[]): number[] {
  const d = Array(8).fill(0) as number[];
  for (const g of games) d[g.placement - 1]!++;
  return d;
}

export function leakFrequency(games: GameLog[]): { leak: string; count: number }[] {
  const m = new Map<string, number>();
  for (const g of games) if (g.leak !== "none") m.set(g.leak, (m.get(g.leak) ?? 0) + 1);
  return [...m].map(([leak, count]) => ({ leak, count })).sort((a, b) => b.count - a.count);
}
