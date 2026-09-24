import Ajv2019 from "ajv";
import addFormats from "ajv-formats";
import schema from "../schema/game-state.schema.json";
import type { Decision, GameTimeline, RoundState } from "./types";

export type * from "./types";
export { deriveDecision, deriveDecisions, estimateIncome, interestOn, copiesOf, parseStage, DEFAULT_RULES, type EconRules } from "./decisions";

/**
 * Runtime validation against the same JSON Schema the types are generated
 * from. One compiled validator per definition; results carry Ajv's error
 * paths so a bad fixture or a bad perception output says which field.
 */
const ajv = new Ajv2019({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, "gs");

/** Limits kept out of the schema so the generated types stay plain arrays (maxItems would generate tuple unions). */
export function roundChecks(r: RoundState, at = ""): string[] {
  const out: string[] = [];
  if (r.shop.length !== 5) out.push(`${at}/shop must have exactly 5 slots`);
  if (r.bench.length > 9) out.push(`${at}/bench has more than 9 units`);
  [...r.board, ...r.bench].forEach((u, i) => {
    if (u.items.length > 3) out.push(`${at}/unit ${i} (${u.championId}) holds more than 3 items`);
  });
  if (r.board.length > r.level) out.push(`${at}/board has ${r.board.length} units at level ${r.level}`);
  const seen = new Set<string>();
  for (const u of r.board) {
    const k = `${u.row},${u.col}`;
    if (seen.has(k)) out.push(`${at}/board has two units on hex ${k}`);
    seen.add(k);
  }
  return out;
}

function make<T>(def: string, extra?: (v: T) => string[]) {
  return (data: unknown): { ok: true; value: T } | { ok: false; errors: string[] } => {
    const v = ajv.getSchema<T>(`gs#/definitions/${def}`);
    if (!v) throw new Error(`no schema definition ${def}`);
    if (!v(data)) return { ok: false, errors: (v.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim()) };
    const more = extra ? extra(data as T) : [];
    return more.length ? { ok: false, errors: more } : { ok: true, value: data as T };
  };
}

export const validateRoundState = make<RoundState>("RoundState", (r) => roundChecks(r));
export const validateTimeline = make<GameTimeline>("GameTimeline", (t) => t.rounds.flatMap((r, i) => roundChecks(r, `/rounds/${i}`)));
export const validateDecision = make<Decision>("Decision");

/** Nearest round to a video timestamp (ms), for pause-and-ask. Returns null when the timeline has no timestamps. */
export function roundAt(timeline: GameTimeline, ms: number): RoundState | null {
  let best: RoundState | null = null;
  for (const r of timeline.rounds) {
    if (r.videoTimestampMs === undefined) continue;
    if (r.videoTimestampMs <= ms && (!best || r.videoTimestampMs > best.videoTimestampMs!)) best = r;
  }
  return best;
}
