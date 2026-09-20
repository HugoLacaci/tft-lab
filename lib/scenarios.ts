import fs from "node:fs";
import path from "node:path";
import { CURRENT_SET } from "./current-set";
import { ScenarioSchema, type Scenario } from "./scenario-schema";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "./scenario-categories";

/**
 * Server-side scenario loader. Reads content/scenarios/<category>/<slug>.json.
 * Validation with file+field naming happens in lib/validate.ts (build time);
 * here we assume valid files and only apply the set filter.
 */
let cached: Scenario[] | null = null;

export function scenarioFiles(root = process.cwd()): string[] {
  const dir = path.join(root, "content", "scenarios");
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const cat of fs.readdirSync(dir)) {
    const cdir = path.join(dir, cat);
    if (!fs.statSync(cdir).isDirectory()) continue;
    for (const f of fs.readdirSync(cdir)) if (f.endsWith(".json")) out.push(path.join(cdir, f));
  }
  return out.sort();
}

/** All scenarios that are valid for the live set. */
export function loadScenarios(): Scenario[] {
  if (cached) return cached;
  const all: Scenario[] = [];
  for (const file of scenarioFiles()) {
    const parsed = ScenarioSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
    if (!parsed.success) throw new Error(`invalid scenario ${file}: run npm run validate`);
    all.push(parsed.data);
  }
  cached = all.filter(isLiveForCurrentSet);
  return cached;
}

/** setAgnostic:false scenarios disappear when the live set moves on. */
export function isLiveForCurrentSet(s: Scenario, setNumber: number = CURRENT_SET.setNumber): boolean {
  return s.setAgnostic || s.set === setNumber;
}

export function scenariosByCategory(cat: ScenarioCategory): Scenario[] {
  return loadScenarios().filter((s) => s.category === cat);
}

export function categoryCounts(): Record<ScenarioCategory, number> {
  const out = Object.fromEntries(SCENARIO_CATEGORIES.map((c) => [c, 0])) as Record<ScenarioCategory, number>;
  for (const s of loadScenarios()) out[s.category]++;
  return out;
}
