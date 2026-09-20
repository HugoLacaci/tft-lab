import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CURRENT_SET } from "./current-set";

/** Curated comps per set: content/sets/<n>/comps.json. Validated at build time. */
export const CompTier = z.enum(["S", "A", "B", "C", "X"]);
export const BoardTuple = z.tuple([z.string().min(1), z.number().int().min(0).max(3), z.number().int().min(0).max(6), z.union([z.literal(1), z.literal(2), z.literal(3)]), z.array(z.string()).max(3)]);
const Ref = z.object({ championId: z.string().min(1), note: z.string().optional() });
const Carry = z.object({ championId: z.string().min(1), items: z.array(z.string()).max(3), note: z.string().optional() });
const AugRef = z.object({ augmentId: z.string().min(1), note: z.string().optional() });

export const CompSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    tier: CompTier,
    style: z.enum(["fast-9", "reroll", "standard", "emblem"]),
    summary: z.string().min(10),
    board: z.array(BoardTuple).min(4).max(12),
    carries: z.array(Carry).min(1),
    flex: z.array(Ref).default([]),
    extra: z.array(Ref).default([]),
    augments: z.array(AugRef).default([]),
    howToPlay: z.array(z.string()).min(1),
    /** Plan per stage; stage2 = 2-1..2-7, stage5 = 5-1 onwards. */
    stages: z.object({ stage2: z.string().min(20), stage3: z.string().min(20), stage4: z.string().min(20), stage5: z.string().min(20) }).optional(),
    positioning: z.string().min(10),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    c.board.forEach((u, i) => {
      const k = `${u[1]},${u[2]}`;
      if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["board", i], message: `two units on hex ${k}` });
      seen.add(k);
    });
  });

export const CompsFileSchema = z.object({
  patch: z.string(),
  verifiedOn: z.string(),
  note: z.string().optional(),
  sources: z.array(z.string()).default([]),
  comps: z.array(CompSchema),
});

export type Comp = z.infer<typeof CompSchema>;
export type CompsFile = z.infer<typeof CompsFileSchema>;

export function compsPath(root = process.cwd(), set = CURRENT_SET.setNumber): string {
  return path.join(root, "content", "sets", String(set), "comps.json");
}

let cached: CompsFile | null | undefined;
export function loadComps(): CompsFile | null {
  if (cached !== undefined) return cached;
  const f = compsPath();
  if (!fs.existsSync(f)) {
    cached = null;
    return cached;
  }
  cached = CompsFileSchema.parse(JSON.parse(fs.readFileSync(f, "utf8")));
  return cached;
}

export const TIER_ORDER: Record<z.infer<typeof CompTier>, number> = { S: 0, A: 1, B: 2, C: 3, X: 4 };
