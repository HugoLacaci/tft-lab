import fs from "node:fs";
import path from "node:path";
import type { CompsChangesFile } from "./comps-changes";

/** Server-side loader for data/generated/comps-changes.json (written by scripts/sync-comps.ts). */
let cached: CompsChangesFile | null | undefined;
export function loadCompsChanges(root = process.cwd()): CompsChangesFile | null {
  if (cached !== undefined) return cached;
  const f = path.join(root, "data", "generated", "comps-changes.json");
  cached = fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as CompsChangesFile) : null;
  return cached;
}
