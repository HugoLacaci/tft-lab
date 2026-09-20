/**
 * Combat simulator input/output shapes. Everything here is serialisable so
 * the planner can persist a fight in localStorage and a URL hash.
 *
 * This is an ESTIMATE, not the game: abilities have no numbers upstream
 * (ability.variables is empty) so they are modelled by cost, star level and
 * the scaling stat; traits and augments are modelled by tier. See engine.ts.
 */
import type { Augment, Champion, Item, Trait } from "../types";

export type Side = "blue" | "red";
export type Star = 1 | 2 | 3;

export interface SimUnit {
  championId: string;
  /** Own-board coordinates: row 0 = frontline, col 0..6. */
  row: number;
  col: number;
  star: Star;
  items: string[];
}

export interface SimTeam {
  units: SimUnit[];
  augments: string[];
}

export interface SimConfig {
  /** Monte-Carlo runs. */
  runs: number;
  seed: number;
  /** Combat length before the overtime tie-break, seconds. */
  maxSeconds: number;
}

export interface SimData {
  champions: Record<string, Champion>;
  items: Record<string, Item>;
  traits: Record<string, Trait>;
  augments: Record<string, Augment>;
}

export interface UnitReport {
  key: string; // `${side}:${row},${col}`
  side: Side;
  championId: string;
  name: string;
  star: Star;
  items: string[];
  damageDealt: number; // average per run
  damageTaken: number;
  healing: number;
  kills: number;
  casts: number;
  survived: number; // 0..1
  avgTimeAlive: number;
  /** average fraction of max HP left at the end (0 when dead) */
  avgHpLeft: number;
}

export interface SimResult {
  runs: number;
  blueWins: number;
  redWins: number;
  draws: number;
  avgDuration: number;
  avgBlueSurvivors: number;
  avgRedSurvivors: number;
  /** Damage a loser would take: survivors + stage-independent base; TFT formula is stage-based, so we report survivors and star sum instead. */
  avgBlueSurvivorStars: number;
  avgRedSurvivorStars: number;
  units: UnitReport[];
  /** How the engine interpreted the two teams (active traits, augment weights). */
  notes: { blue: TeamNotes; red: TeamNotes };
}

export interface ActiveTrait {
  id: string;
  name: string;
  count: number;
  /** breakpoint reached (units) or 0 when inactive */
  reached: number;
  style: "bronze" | "silver" | "gold" | "prismatic" | "unique" | null;
  next: number | null;
}

export interface TeamNotes {
  traits: ActiveTrait[];
  augments: { id: string; name: string; tier: string; offense: number; defense: number; note: string }[];
}
