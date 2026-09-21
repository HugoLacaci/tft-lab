/**
 * Diff the curated comps against the previous patch and publish the result.
 *
 *   npm run sync-comps
 *
 * Reads  content/sets/<n>/comps.json (the live set's comps)
 *        data/generated/comps-history.json (baseline + last seen version)
 * Writes data/generated/comps-changes.json (badges for /set/comps)
 *        data/generated/comps-history.json (rolled forward)
 *
 * Runs before `next build` and in the daily sync workflow, so the history is
 * committed at most a day after a comps edit. Names for the change text come
 * from the synced set data when it exists.
 */
import fs from "node:fs";
import path from "node:path";
import { CompsFileSchema, compsPath } from "../lib/comps";
import { advanceHistory, type CompsHistoryFile } from "../lib/comps-changes";
import { CURRENT_SET } from "../lib/current-set";

const root = process.cwd();
const gen = path.join(root, "data", "generated");
const historyFile = path.join(gen, "comps-history.json");
const changesFile = path.join(gen, "comps-changes.json");

const src = compsPath(root);
if (!fs.existsSync(src)) {
  console.log(`sync-comps: no comps file for set ${CURRENT_SET.setNumber}; nothing to do`);
  process.exit(0);
}
const current = CompsFileSchema.parse(JSON.parse(fs.readFileSync(src, "utf8")));
let history: CompsHistoryFile = fs.existsSync(historyFile) ? (JSON.parse(fs.readFileSync(historyFile, "utf8")) as CompsHistoryFile) : { baseline: null, latest: null };
// A history written for another set is meaningless: start over.
if (history.set !== undefined && history.set !== CURRENT_SET.setNumber) history = { baseline: null, latest: null };

const names: Record<string, string> = {};
const setFile = path.join(gen, `set-${CURRENT_SET.setNumber}.json`);
if (fs.existsSync(setFile)) {
  const set = JSON.parse(fs.readFileSync(setFile, "utf8")) as { champions: { id: string; name: string }[]; items: { id: string; name: string }[]; augments: { id: string; name: string }[] };
  for (const x of [...set.champions, ...set.items, ...set.augments]) names[x.id] = x.name;
}

const { history: next, changes } = advanceHistory(history, current, names);
fs.mkdirSync(gen, { recursive: true });
fs.writeFileSync(historyFile, JSON.stringify({ set: CURRENT_SET.setNumber, ...next }, null, 2) + "\n");
fs.writeFileSync(changesFile, JSON.stringify(changes, null, 2) + "\n");
const n = Object.values(changes.changes);
const count = (k: string) => n.filter((c) => c.kind === k).length;
console.log(
  `sync-comps: patch ${changes.patch} vs ${changes.since ?? "(no baseline yet)"}: ${count("new")} new, ${count("up")} up, ${count("down")} down, ${count("adjusted")} adjusted, ${changes.removed.length} removed`,
);
