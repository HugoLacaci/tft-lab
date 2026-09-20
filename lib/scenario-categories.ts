export const SCENARIO_CATEGORIES = [
  "econ",
  "level-timing",
  "augment",
  "items",
  "positioning",
  "pivot",
  "carousel",
  "scouting",
  "hp-management",
  "endgame",
] as const;

export type ScenarioCategory = (typeof SCENARIO_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  econ: "Economy",
  "level-timing": "Level timing",
  augment: "Augments",
  items: "Items",
  positioning: "Positioning",
  pivot: "Pivoting",
  carousel: "Carousel",
  scouting: "Scouting",
  "hp-management": "HP management",
  endgame: "Endgame",
};

export const CATEGORY_GUIDE: Record<ScenarioCategory, string> = {
  econ: "/guides/economy",
  "level-timing": "/guides/leveling",
  augment: "/guides/augments",
  items: "/guides/items",
  positioning: "/guides/positioning",
  pivot: "/guides/pivoting",
  carousel: "/guides/items",
  scouting: "/guides/scouting",
  "hp-management": "/guides/hp",
  endgame: "/guides/stage-plan",
};

export const CATEGORY_BLURBS: Record<ScenarioCategory, string> = {
  econ: "Interest, the 50-gold floor, when breaking it is correct and when it is a leak.",
  "level-timing": "Standard level timings, when to deviate, and why levelling and rolling in the same round is usually wrong.",
  augment: "Evaluate an augment against what you can actually build, your econ plan and your HP.",
  items: "Slam or hold, who carries the tank item, when an emblem redirects the game.",
  positioning: "Frontline and backline defaults, spread versus clump, counter-positioning against the lobby's threats.",
  pivot: "Read contest early and abandon a line before it costs you the game.",
  carousel: "Pick the item you need to slam, not the fourth component.",
  scouting: "What to look at, when, and what to change because of it.",
  "hp-management": "HP as a resource: when to greed and when to stabilise.",
  endgame: "Cap the board, play for the placement you can actually reach.",
};
