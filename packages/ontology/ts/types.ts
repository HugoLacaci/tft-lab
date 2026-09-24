/**
 * GENERATED from packages/ontology/schema/game-state.schema.json by packages/ontology/scripts/generate.mjs.
 * Do not edit by hand: change the schema and run `npm run ontology`.
 */

export type Phase = "planning" | "combat" | "carousel" | "augment-select" | "unknown";
export type StreakType = "win" | "loss";
export type Provenance = "vision" | "riot-api" | "manual" | "synthetic";

/**
 * Oracle's game-state ontology. Single source of truth: TypeScript types (packages/ontology/ts) and Pydantic models (packages/ontology/py) are generated from this file. RoundState.board uses the trainer's PlacedUnit shape unchanged so the existing Board component renders a timeline with no adapter.
 */
export interface GameState {
  roundState?: RoundState;
  gameTimeline?: GameTimeline;
  decision?: Decision;
}
export interface RoundState {
  matchId: string;
  /**
   * "4-2"
   */
  stage: string;
  stageNumber: number;
  roundNumber: number;
  phase: Phase;
  /**
   * Within a planning phase: start (shop just rolled, gold known) or end (final board before combat). Decisions compare start→end of one planning phase when both exist.
   */
  phaseMoment?: "start" | "end";
  /**
   * Present when derived from a VOD.
   */
  videoTimestampMs?: number;
  gold: number;
  health: number;
  level: number;
  xp: {
    current: number;
    needed: number;
  };
  streak: {
    type: StreakType;
    count: number;
  };
  board: PlacedUnit[];
  /**
   * At most 9 (runtime check).
   */
  bench: BenchUnit[];
  /**
   * Exactly 5 slots (runtime check; not minItems/maxItems so the generated type stays (string | null)[]).
   */
  shop: (string | null)[];
  benchItems: string[];
  activeTraits: {
    traitId: string;
    count: number;
    style: string;
  }[];
  augments: string[];
  /**
   * The augments on offer in an augment-select phase; lets a Decision record chosen vs offered.
   */
  augmentOptions?: string[];
  /**
   * The board fought this round, if visible.
   */
  opponentPreview?: PlacedUnit[];
  lobby?: {
    playerName: string;
    health: number;
    level?: number;
  }[];
  incomeEvents?: IncomeEvent[];
  /**
   * Per-field confidence 0..1 from perception; manual and riot-api states use 1.
   */
  confidence: {
    [k: string]: number | undefined;
  };
  provenance: Provenance;
}
/**
 * Identical to lib/scenario-schema.ts PlacedUnit.
 */
export interface PlacedUnit {
  championId: string;
  row: number;
  col: number;
  star: 1 | 2 | 3;
  /**
   * At most 3 (checked by the runtime validator; not expressed as maxItems so the generated type stays string[]).
   */
  items: string[];
}
/**
 * Identical to lib/scenario-schema.ts BenchUnit.
 */
export interface BenchUnit {
  championId: string;
  star: 1 | 2 | 3;
  /**
   * At most 3 (checked by the runtime validator; not expressed as maxItems so the generated type stays string[]).
   */
  items: string[];
  slot?: number;
}
/**
 * Gold that arrived outside base income, interest and streak: PvE drops, augment gold, Wisp effects, carousel. Enumerated so the accounting equation has somewhere to put it.
 */
export interface IncomeEvent {
  kind: "pve-drop" | "augment" | "wisp" | "carousel" | "other";
  gold: number;
  note?: string;
}
export interface GameTimeline {
  matchId: string;
  setNumber: number;
  patch: string;
  playerPuuid?: string;
  /**
   * Display name for the analysed seat; anonymise before it leaves the browser.
   */
  playerName?: string;
  source: "vod" | "riot-api" | "upload" | "fixture";
  sourceUrl?: string;
  rounds: RoundState[];
  finalPlacement?: number;
  title?: string;
  notes?: string;
}
/**
 * The diff between two consecutive RoundStates: what the player did. Pure output of deriveDecisions; the accounting equation must balance or lowConfidence is set.
 */
export interface Decision {
  fromStage: string;
  toStage: string;
  /**
   * Index of the source RoundState in the timeline.
   */
  fromIndex: number;
  toIndex: number;
  goldStart: number;
  goldEnd: number;
  /**
   * Gold that arrived between the two states (0 within one planning phase).
   */
  income: number;
  /**
   * true when income was computed from set constants rather than observed.
   */
  incomeEstimated: boolean;
  goldSpent: number;
  /**
   * Interest breakpoints given up by the spending: interest(goldStart+income) − interest(goldEnd).
   */
  interestLost: number;
  rolls: number;
  /**
   * Number of XP purchases (4 gold each by default).
   */
  xpBought: number;
  levelled: boolean;
  bought: {
    championId: string;
    copies: number;
    cost: number;
  }[];
  sold: {
    championId: string;
    copies: number;
    gold: number;
  }[];
  itemsEquipped: {
    itemId: string;
    toUnitId: string;
  }[];
  itemsCombined: {
    from: string[];
    to: string;
  }[];
  repositioned: {
    unitId: string;
    from: Hex;
    to: Hex;
  }[];
  augmentPicked?: {
    chosen: string;
    offered: string[];
  };
  starUpsAchieved: {
    championId: string;
    star: 2 | 3;
  }[];
  healthLost: number;
  /**
   * Estimate; flagged as such in the UI.
   */
  boardStrengthDelta?: number;
  /**
   * goldStart + income + sold − bought − xp − rolls·rollCost − goldEnd. Zero when the equation balances.
   */
  residual: number;
  lowConfidence: boolean;
  /**
   * Why the decision is low confidence, in words the UI can show.
   */
  notes?: string[];
  evidence: {
    stage: string;
    field: string;
    value: string;
    confidence?: number;
  }[];
}
export interface Hex {
  /**
   * 0 = frontline (nearest the enemy), 3 = backline.
   */
  row: number;
  col: number;
}
