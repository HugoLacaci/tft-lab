/**
 * Difficulty tiers, named after the ranked ladder so a drill or puzzle says
 * who it is written for. `difficulty` in a scenario file is the tier level.
 */
export type Difficulty = 1 | 2 | 3 | 4;

export interface RankTier {
  level: Difficulty;
  /** URL segment: /trainer/puzzles/<id> */
  id: string;
  label: string;
  /** Short label for chips. */
  short: string;
  /** Rank colours (approximate ladder palette). */
  color: string;
  glow: string;
  blurb: string;
  /** Which Little Legend fronts this tier (public/assets/legends/<name>.webp). */
  legend: string;
}

export const RANK_TIERS: readonly RankTier[] = [
  {
    level: 1,
    id: "iron-silver",
    label: "Iron – Silver",
    short: "Iron–Silver",
    color: "#a9b4bf",
    glow: "rgba(169, 180, 191, 0.45)",
    blurb: "One idea per puzzle: frontline in front, carry behind, hold the pair, do not roll at 2-1. If it feels obvious, good: that is the habit forming.",
    legend: "pengu-1",
  },
  {
    level: 2,
    id: "gold-platinum",
    label: "Gold – Platinum",
    short: "Gold–Plat",
    color: "#e6b95a",
    glow: "rgba(230, 185, 90, 0.45)",
    blurb: "Two things interact: a scout report and a placement, an item slam and a future carry, interest and a pair. Nothing exotic, but you have to read the whole board.",
    legend: "pengu-2",
  },
  {
    level: 3,
    id: "emerald-diamond",
    label: "Emerald – Diamond",
    short: "Emerald–Dia",
    color: "#4fd1a0",
    glow: "rgba(79, 209, 160, 0.45)",
    blurb: "Counter-positioning against real threats, econ calls with a clock on them, when the standard play is wrong. The lobby matters as much as your board.",
    legend: "pengu-3",
  },
  {
    level: 4,
    id: "master-plus",
    label: "Master+",
    short: "Master+",
    color: "#c68cff",
    glow: "rgba(198, 140, 255, 0.5)",
    blurb: "Several threats, one hex. Marginal calls with two acceptable answers and one clearly wrong one. If you disagree with the key, read the explanation and then disagree properly.",
    legend: "choncc-wise",
  },
] as const;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = Object.fromEntries(RANK_TIERS.map((t) => [t.level, t.label])) as Record<Difficulty, string>;

export function tierByLevel(level: number): RankTier {
  return RANK_TIERS.find((t) => t.level === level) ?? RANK_TIERS[0]!;
}

export function tierById(id: string): RankTier | undefined {
  return RANK_TIERS.find((t) => t.id === id);
}
