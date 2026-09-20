/**
 * Competitive pathway dates and formats.
 *
 * [VERIFY] before shipping and at every set: these values come from the
 * project brief (2026-09-20). Cross-check against the official TFT esports
 * pages linked in `sources`. Anything you cannot confirm, mark `verified: false`
 * and the page renders it with a caveat.
 */
export interface CircuitEvent {
  name: string;
  window: string;
  region?: string;
  prize?: string;
  verified: boolean;
}

export const CIRCUIT = {
  verifiedOn: "2026-09-20",
  verified: false, // flip to true only after checking the official pages
  sources: {
    esportsNews: "https://teamfighttactics.leagueoflegends.com/en-us/news/esports/",
    liquipedia: "https://liquipedia.net/tft/Main_Page",
  },
  ladderSnapshots: {
    description: "Snapshots of the ranked ladder are taken on select Tuesdays through the set. Top finishers earn Ranked Ladder Points toward Regional Finals.",
    times: [
      { region: "AMER", time: "9 PM PT" },
      { region: "EMEA", time: "9 PM CET" },
      { region: "APAC", time: "9 PM SGT" },
    ],
  },
  trials: {
    description:
      "Tactician's Trials. Invitations come from Trials snapshots of the ranked leaderboard. Day 1: 256 players over 4 games; top 32 advance directly and the bottom 32 play 2 more games for the remaining slots. Days 2–4: elimination with reseeding. Day 5 decides the top 8, who advance to Regional Finals.",
    events: [
      { name: "Trials 1", window: "Sep 19–27", verified: false },
      { name: "Trials 2", window: "Oct 10–18", verified: false },
    ] as CircuitEvent[],
  },
  regionalFinals: { players: 64, description: "64 players per region, seeded from Trials and Ranked Ladder Points." },
  proCircuit: {
    description:
      "TFT Pro Circuit: the top 32 players per region (AMER, EMEA, APAC, CN) across three Cups per set. Each Cup pays $30K and awards Pro Points toward the Tactician's Crown. Cups use a checkmate format: reaching 20 points puts the lobby “in check”, and you must then win a game to clinch.",
    perRegion: 32,
    regions: ["AMER", "EMEA", "APAC", "CN"],
    prizePerCup: "$30,000",
    checkmatePoints: 20,
    cups: [
      { name: "Riftbeast Cup", window: "Sep 4–6", prize: "$30K", verified: false },
      { name: "Elderwood Cup", window: "Sep 18–20", prize: "$30K", verified: false },
      { name: "Blossom Cup", window: "Oct 2–4", prize: "$30K", verified: false },
    ] as CircuitEvent[],
  },
} as const;
