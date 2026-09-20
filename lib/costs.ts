/**
 * Single source of truth for cost-tier and trait-style colours.
 * app/globals.css mirrors these as CSS custom properties; if you change one,
 * change both (tests/costs.test.ts guards the pairing).
 */
export type Cost = 1 | 2 | 3 | 4 | 5;

export const COST_COLORS: Record<Cost, string> = {
  1: "#9aa4b0",
  2: "#1bc47d",
  3: "#2f7fdc",
  4: "#c440e0",
  5: "#ffb642",
};

export type TraitStyle = "bronze" | "silver" | "gold" | "prismatic" | "unique";

export const STYLE_COLORS: Record<TraitStyle, string> = {
  bronze: "#b06d3a",
  silver: "#a3b0bd",
  gold: "#ffb642",
  prismatic: "#d7c8ff",
  unique: "#ff8a5c",
};

export const COSTS: Cost[] = [1, 2, 3, 4, 5];

export function isCost(n: number): n is Cost {
  return n >= 1 && n <= 5 && Number.isInteger(n);
}

export function costColor(cost: number): string {
  return isCost(cost) ? COST_COLORS[cost] : COST_COLORS[1];
}
