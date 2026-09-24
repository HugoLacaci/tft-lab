import fs from "node:fs";
import path from "node:path";
import { StudySchema, type Study } from "./study-schema";

/** Server-side loader for content/studies/*.json (validated in lib/validate.ts). */
let cached: Study[] | null = null;

export function studyFiles(root = process.cwd()): string[] {
  const dir = path.join(root, "content", "studies");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort();
}

/** Newest game first. */
export function loadStudies(): Study[] {
  if (cached) return cached;
  const all: Study[] = [];
  for (const file of studyFiles()) {
    const parsed = StudySchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
    if (!parsed.success) throw new Error(`invalid study ${file}: run npm run validate`);
    all.push(parsed.data);
  }
  cached = all.sort((a, b) => b.video.publishedOn.localeCompare(a.video.publishedOn));
  return cached;
}

export function studyById(id: string): Study | undefined {
  return loadStudies().find((s) => s.id === id);
}
