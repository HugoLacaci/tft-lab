import type { RawCdSetEntryT } from "./schema";

/**
 * Mutators that describe a game mode variant of a set rather than the ranked
 * set itself. They share the set number, so we must skip them when picking
 * the live set. Observed 2026-09-20: TFTSet16_PVEMODE, TFTSet14_TURBO,
 * TFTSet15_PAIRS, TFTSetEventER, TFTSet16_CarouselOfChaos,
 * TFTSet13_Evolved_MacaoMode, TFTSet7_Stage2_CT, TFTSetTutorial.
 */
const VARIANT_RE = /(PVE|TURBO|PAIRS|EVENT|TUTORIAL|CAROUSEL|MACAO|_CT\b|_CT$)/i;
const STAGE_RE = /stage\s*\d+/i;

export interface Detection {
  entry: RawCdSetEntryT;
  candidates: string[];
  reason: string;
}

/**
 * Pick the live set: highest `number`. When several entries share it, drop
 * mode variants, then prefer a mutator with a stage suffix (mid-set update),
 * then the shortest mutator (the base set).
 */
export function detectLiveSet(setData: RawCdSetEntryT[]): Detection {
  if (setData.length === 0) throw new Error("detectLiveSet: empty setData");
  const max = Math.max(...setData.map((s) => s.number));
  const sameNumber = setData.filter((s) => s.number === max);
  let pool = sameNumber.filter((s) => !VARIANT_RE.test(s.mutator));
  if (pool.length === 0) pool = sameNumber;

  const staged = pool.filter((s) => STAGE_RE.test(s.mutator));
  let entry: RawCdSetEntryT;
  let reason: string;
  if (staged.length > 0) {
    // Highest stage number wins if there are several.
    entry = staged.sort((a, b) => stageNumber(b.mutator) - stageNumber(a.mutator))[0]!;
    reason = "highest number, mid-set stage mutator preferred";
  } else {
    entry = pool.sort((a, b) => a.mutator.length - b.mutator.length)[0]!;
    reason = "highest number, base mutator (no stage entry present)";
  }
  return { entry, candidates: sameNumber.map((s) => s.mutator), reason };
}

function stageNumber(mutator: string): number {
  const m = mutator.match(/stage\s*(\d+)/i);
  return m ? Number(m[1]) : 0;
}
