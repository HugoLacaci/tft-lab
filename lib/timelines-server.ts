import fs from "node:fs";
import path from "node:path";
import { validateTimeline, type GameTimeline } from "@/packages/ontology/ts";

/**
 * Server-side loader for game timelines. Two sources, one shape:
 *   packages/ontology/fixtures/*.json   hand-built examples (source: "fixture")
 *   content/timelines/*.json            annotated Study Hall games (studyId set)
 * Later sources (Riot API, perception) land in the same shape and go through
 * the same validator.
 */
let cached: GameTimeline[] | null = null;

export function timelineFiles(root = process.cwd()): string[] {
  const out: string[] = [];
  for (const dir of [path.join(root, "packages", "ontology", "fixtures"), path.join(root, "content", "timelines")]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) out.push(path.join(dir, f));
  }
  return out;
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

export function timelineForStudy(studyId: string): GameTimeline | undefined {
  return loadTimelines().find((t) => t.studyId === studyId);
}
