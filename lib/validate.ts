import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export interface Problem {
  file: string;
  field?: string;
  message: string;
}

const CurrentSchema = z.object({
  setNumber: z.number().int().nonnegative(),
  setName: z.string(),
  mutator: z.string(),
  syncedAt: z.string(),
  patch: z.string(),
});

export function validateCurrent(root = process.cwd()): Problem[] {
  const file = path.join(root, "data", "generated", "current.json");
  if (!fs.existsSync(file)) return [{ file: "data/generated/current.json", message: "missing" }];
  const parsed = CurrentSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      file: "data/generated/current.json",
      field: i.path.join("."),
      message: i.message,
    }));
  }
  return [];
}

export function runValidation(root = process.cwd()): Problem[] {
  return [...validateCurrent(root)];
}
