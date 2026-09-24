import fs from "node:fs";
import path from "node:path";
import { validateTimeline, type GameTimeline } from "@/packages/ontology/ts";

/**
 * Server-side loader for analysis timelines. M1: the hand-built fixtures in
 * packages/ontology/fixtures. Later sources (Riot API, perception) land in
 * the same shape and go through the same validator.
 */
let cached: GameTimeline[] | null = null;

export function timelineFiles(root = process.cwd()): string[] {
  const dir = path.join(root, "packages", "ontology", "fixtures");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort();
}

export function loadTimelines(): GameTimeline[] {
  if (cached) return cached;
  const out: GameTimeline[] = [];
  for (const f of timelineFiles()) {
    const r = validateTimeline(JSON.parse(fs.readFileSync(f, "utf8")));
    if (!r.ok) throw new Error(`invalid timeline ${f}: ${r.errors.slice(0, 3).join("; ")}`);
    out.push(r.value);
  }
  cached = out;
  return out;
}

export function timelineById(matchId: string): GameTimeline | undefined {
  return loadTimelines().find((t) => t.matchId === matchId);
}
