import { readJson, writeJson } from "../storage";
import type { RiotGame } from "./analyze";
import type { Platform } from "./types";

/** localStorage tftlab.riot.v1: settings + cached games for one Riot ID. */
export interface RiotStore {
  version: 1;
  riotId: string; // "Name#TAG"
  platform: Platform;
  apiKey: string;
  puuid: string | null;
  rank: string | null;
  fetchedAt: string | null;
  games: RiotGame[];
}

export const RIOT_KEY = "tftlab.riot.v1";

export function readRiot(): RiotStore {
  const d = readJson<RiotStore | null>(RIOT_KEY, null);
  if (!d || d.version !== 1 || !Array.isArray(d.games)) return { version: 1, riotId: "", platform: "euw1", apiKey: "", puuid: null, rank: null, fetchedAt: null, games: [] };
  return d;
}

export function writeRiot(d: RiotStore): boolean {
  return writeJson(RIOT_KEY, d);
}

/** Merge by matchId, newest first. */
export function mergeGames(existing: RiotGame[], incoming: RiotGame[]): RiotGame[] {
  const m = new Map<string, RiotGame>();
  for (const g of [...existing, ...incoming]) m.set(g.matchId, g);
  return [...m.values()].sort((a, b) => b.at.localeCompare(a.at));
}
