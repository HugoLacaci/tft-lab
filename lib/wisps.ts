import fs from "node:fs";
import path from "node:path";
import { CURRENT_SET } from "./current-set";

/**
 * Wisp gold costs and appearance stages. Not in the game files: the synced
 * data/generated/wisps.json (scripts/sync-wisps.ts) is preferred; the curated
 * content/sets/<n>/wisps.json fills any gap.
 */
export interface WispsFile {
  note: string;
  verifiedOn: string;
  sources: string[];
  costs: Record<string, number>;
}
export interface WispInfo {
  cost: number;
  stage?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+]/g, "");

let cached: { lookup: (name: string) => WispInfo | null; syncedAt: string | null; verifiedOn: string | null; source: string | null } | undefined;

export function loadWispInfo() {
  if (cached) return cached;
  const map = new Map<string, WispInfo>();
  let syncedAt: string | null = null;
  let source: string | null = null;
  let verifiedOn: string | null = null;
  const curated = path.join(process.cwd(), "content", "sets", String(CURRENT_SET.setNumber), "wisps.json");
  if (fs.existsSync(curated)) {
    const c = JSON.parse(fs.readFileSync(curated, "utf8")) as WispsFile;
    verifiedOn = c.verifiedOn;
    for (const [k, v] of Object.entries(c.costs)) map.set(norm(k), { cost: v });
  }
  const generated = path.join(process.cwd(), "data", "generated", "wisps.json");
  if (fs.existsSync(generated)) {
    const g = JSON.parse(fs.readFileSync(generated, "utf8")) as { syncedAt: string; source: string; wisps: { name: string; cost: number; stage: string }[] };
    syncedAt = g.syncedAt;
    source = g.source;
    for (const w of g.wisps) map.set(norm(w.name), { cost: w.cost, stage: w.stage });
  }
  cached = {
    lookup: (name: string) => map.get(norm(name)) ?? map.get(norm(baseWispName(name))) ?? null,
    syncedAt,
    verifiedOn,
    source,
  };
  return cached;
}

/** Base name for an upgraded entry ("Foo+" / "Foo (upgraded)" → "Foo"). */
export function baseWispName(name: string): string {
  return name.replace(/\s*\+$/, "").replace(/\s*\(upgraded\)$/i, "").trim();
}
