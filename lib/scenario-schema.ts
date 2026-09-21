import { z } from "zod";
import { SCENARIO_CATEGORIES } from "./scenario-categories";

/**
 * Scenario JSON schema. Files live in content/scenarios/<category>/<slug>.json
 * and are validated at build time by scripts/validate.ts.
 *
 * Board coordinates: { row: 0..3, col: 0..6 }, row 0 = frontline (nearest
 * the enemy), row 3 = backline. Odd rows are shifted right by half a hex.
 * See components/board/Board.tsx.
 */
export const Hex = z.object({ row: z.number().int().min(0).max(3), col: z.number().int().min(0).max(6) });
export type HexCoord = z.infer<typeof Hex>;

export const PlacedUnitSchema = z.object({
  championId: z.string().min(1),
  row: z.number().int().min(0).max(3),
  col: z.number().int().min(0).max(6),
  star: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  items: z.array(z.string()).max(3).default([]),
});
export type PlacedUnit = z.infer<typeof PlacedUnitSchema>;

export const BenchUnitSchema = PlacedUnitSchema.omit({ row: true, col: true }).extend({
  /** bench slot 0..8 */
  slot: z.number().int().min(0).max(8).optional(),
});
export type BenchUnit = z.infer<typeof BenchUnitSchema>;

export const ScenarioStateSchema = z.object({
  stage: z.string().regex(/^\d-\d$/, 'stage like "3-2"'),
  gold: z.number().int().min(0),
  hp: z.number().int().min(1).max(100),
  level: z.number().int().min(1).max(10),
  xpToNext: z.number().int().min(0),
  streak: z.object({ type: z.enum(["win", "loss"]), count: z.number().int().min(0) }),
  board: z.array(PlacedUnitSchema),
  bench: z.array(BenchUnitSchema).max(9),
  shop: z.array(z.string().nullable()).length(5),
  items: z.array(z.string()),
  enemyBoard: z.array(PlacedUnitSchema).optional(),
  lobby: z.array(z.object({ player: z.string(), hp: z.number().int(), note: z.string() })).optional(),
});
export type ScenarioState = z.infer<typeof ScenarioStateSchema>;

const ChoiceQ = z.object({
  type: z.literal("choice"),
  options: z.array(z.object({ id: z.string(), label: z.string(), icon: z.string().optional() })).min(2),
  correct: z.array(z.string()).min(1),
});
const PlacementQ = z.object({
  type: z.literal("placement"),
  unitId: z.string(),
  correctHexes: z.array(Hex).min(1),
});
const AugmentQ = z.object({
  type: z.literal("augment"),
  options: z.array(z.string()).min(2),
  correct: z.string(),
});
const ItemHolderQ = z.object({
  type: z.literal("item-holder"),
  itemId: z.string(),
  correctUnitIds: z.array(z.string()).min(1),
});
const OrderingQ = z.object({
  type: z.literal("ordering"),
  steps: z.array(z.string()).min(2),
  correctOrder: z.array(z.number().int().min(0)),
});
/** Pick two units on the board to swap places (the chess-puzzle "one move"). */
const SwapQ = z.object({
  type: z.literal("swap"),
  correctPairs: z.array(z.tuple([z.string(), z.string()])).min(1),
});

export const QuestionSchema = z.discriminatedUnion("type", [ChoiceQ, PlacementQ, AugmentQ, ItemHolderQ, OrderingQ, SwapQ]);
export type Question = z.infer<typeof QuestionSchema>;

export const ScenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "kebab-case id"),
    category: z.enum(SCENARIO_CATEGORIES),
    /** Rank tier the drill is written for: 1 Iron–Silver, 2 Gold–Platinum, 3 Emerald–Diamond, 4 Master+ (lib/rank-tiers.ts). */
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    /** "drill" (default) or "puzzle": puzzles also appear in the tactics-puzzle ladder grouped by tier. */
    kind: z.enum(["drill", "puzzle"]).default("drill"),
    /** Short card title for puzzles; falls back to the first sentence of the prompt. */
    title: z.string().min(4).max(64).optional(),
    setAgnostic: z.boolean(),
    /** Required when setAgnostic is false: the set the champion ids belong to. */
    set: z.number().int().positive().optional(),
    prompt: z.string().min(10),
    state: ScenarioStateSchema,
    question: QuestionSchema,
    explanation: z.string().min(80, "explanation must teach: at least 80 characters"),
    principle: z.string().min(10),
    guideLink: z.string().regex(/^\/guides\/[a-z-]+(#[a-z0-9-]+)?$/, "guideLink like /guides/economy#interest"),
    commonMistake: z.string().optional(),
  })
  .superRefine((s, ctx) => {
    if (!s.setAgnostic && !s.set) ctx.addIssue({ code: "custom", path: ["set"], message: "set is required when setAgnostic is false" });
    if (s.question.type === "ordering") {
      const n = s.question.steps.length;
      const sorted = [...s.question.correctOrder].sort((a, b) => a - b);
      if (sorted.length !== n || sorted.some((v, i) => v !== i))
        ctx.addIssue({ code: "custom", path: ["question", "correctOrder"], message: `must be a permutation of 0..${n - 1}` });
    }
    if (s.question.type === "choice") {
      const ids = new Set(s.question.options.map((o) => o.id));
      for (const c of s.question.correct)
        if (!ids.has(c)) ctx.addIssue({ code: "custom", path: ["question", "correct"], message: `unknown option id "${c}"` });
    }
    if (s.question.type === "swap") {
      const onBoard = new Set(s.state.board.map((u) => u.championId));
      s.question.correctPairs.forEach((p, i) => {
        if (p[0] === p[1]) ctx.addIssue({ code: "custom", path: ["question", "correctPairs", i], message: "a pair needs two different units" });
        for (const id of p) if (!onBoard.has(id)) ctx.addIssue({ code: "custom", path: ["question", "correctPairs", i], message: `"${id}" is not on the board` });
      });
      const counts = new Map<string, number>();
      for (const u of s.state.board) counts.set(u.championId, (counts.get(u.championId) ?? 0) + 1);
      for (const [id, n] of counts) if (n > 1) ctx.addIssue({ code: "custom", path: ["state", "board"], message: `swap questions need unique unit ids on the board; "${id}" appears ${n} times` });
    }
    if (s.question.type === "augment" && !s.question.options.includes(s.question.correct))
      ctx.addIssue({ code: "custom", path: ["question", "correct"], message: "correct must be one of options" });
    const occupied = new Set<string>();
    s.state.board.forEach((u, i) => {
      const k = `${u.row},${u.col}`;
      if (occupied.has(k)) ctx.addIssue({ code: "custom", path: ["state", "board", i], message: `two units on hex ${k}` });
      occupied.add(k);
    });
    if (s.state.board.length > s.state.level)
      ctx.addIssue({ code: "custom", path: ["state", "board"], message: `${s.state.board.length} units on board but level ${s.state.level}` });
    if (s.question.type === "placement") {
      if (s.state.board.length >= s.state.level)
        ctx.addIssue({ code: "custom", path: ["state", "board"], message: `placement question needs a free slot: ${s.state.board.length} units on board at level ${s.state.level}` });
      for (const h of s.question.correctHexes)
        if (occupied.has(`${h.row},${h.col}`))
          ctx.addIssue({ code: "custom", path: ["question", "correctHexes"], message: `correct hex ${h.row},${h.col} is already occupied` });
    }
  });

export type Scenario = z.infer<typeof ScenarioSchema>;
