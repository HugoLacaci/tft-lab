import fs from "node:fs";
import path from "node:path";

/**
 * data/generated/meta.json, written by scripts/sync-meta.ts from Riot match
 * data (top ladder). Items, units and comp clusters with average placement.
 */
export type Rank = "S" | "A" | "B" | "C" | "D" | "F";

export interface MetaItem {
  id: string;
  name: string;
  games: number;
  avg: number;
  top4: number;
  pick: number;
  rank: Rank;
}
export interface MetaUnit {
  id: string;
  name: string;
  games: number;
  avg: number;
  top4: number;
  pick: number;
  threeStar: number;
  items: string[];
}
export interface MetaComp {
  key: string;
  name: string;
  games: number;
  avg: number;
  top4: number;
  win: number;
  pick: number;
  traits: { id: string; count: number }[];
  units: { id: string; freq: number; items: string[] }[];
}
export interface MetaFile {
  syncedAt: string;
  set: number;
  patch: string;
  platforms: string[];
  matches: number;
  players: number;
  items: MetaItem[];
  units: MetaUnit[];
  comps: MetaComp[];
}

let cached: MetaFile | null | undefined;
export function loadMeta(): MetaFile | null {
  if (cached !== undefined) return cached;
  const f = path.join(process.cwd(), "data", "generated", "meta.json");
  cached = fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as MetaFile) : null;
  return cached;
}

/**
 * Rank by average placement quantiles: best 12% S, next 23% A, next 30% B,
 * next 20% C, next 10% D, rest F. Deterministic given the sample.
 */
export function rankByPlacement<T extends { avg: number; rank: Rank }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => a.avg - b.avg);
  const n = sorted.length;
  const cut = (p: number) => Math.round(n * p);
  return sorted.map((r, i) => ({ ...r, rank: i < cut(0.12) ? "S" : i < cut(0.35) ? "A" : i < cut(0.65) ? "B" : i < cut(0.85) ? "C" : i < cut(0.95) ? "D" : "F" }));
}

export function metaItemsById(m: MetaFile | null): Record<string, MetaItem> {
  return Object.fromEntries((m?.items ?? []).map((i) => [i.id, i]));
}
