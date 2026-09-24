/**
 * Creators to learn from. Seeded from community "streamers to learn from"
 * roundups. `kind` separates teaching channels (talk through decisions) from
 * high-level play channels (watch the decisions; they will not narrate).
 *
 * [VERIFY] each link is still active before shipping; set `verifiedOn` when
 * you do. Unverified entries render with a note.
 */
export interface Creator {
  name: string;
  platform: "Twitch" | "YouTube" | "Both";
  link: string;
  learn: string;
  kind: "teaching" | "high-level";
  verifiedOn: string | null;
  /** YouTube channel when the main link is Twitch (or the same link). */
  youtube?: string;
}

export const CREATORS: Creator[] = [
  { name: "Mortdog", platform: "Twitch", link: "https://www.twitch.tv/mortdog", learn: "The lead designer playing his own game and explaining why systems are tuned the way they are. Best source for what a patch is trying to do.", kind: "teaching", verifiedOn: null },
  { name: "Frodan", platform: "YouTube", link: "https://www.youtube.com/@Frodan", learn: "Patch rundowns and tier lists with the reasoning attached; co-curates the TFT Academy comps.", kind: "teaching", verifiedOn: null },
  { name: "Dishsoap", platform: "Both", link: "https://www.twitch.tv/dishsoap", youtube: "https://www.youtube.com/@dishsoaptft", learn: "Two-time World Champion. Top-ladder play with occasional explanation of level and roll timings; co-curates TFT Academy. His edited YouTube games are the best fast-9 study material there is.", kind: "high-level", verifiedOn: "2026-09-24" },
  { name: "k3soju", platform: "Twitch", link: "https://www.twitch.tv/k3soju", learn: "Very high-level flexible play. Watch how early he commits or refuses to commit, not the comps.", kind: "high-level", verifiedOn: null },
  { name: "Milk", platform: "Twitch", link: "https://www.twitch.tv/milk", learn: "Talks through decisions constantly; good for hearing the scout-then-position loop in real time.", kind: "teaching", verifiedOn: null },
  { name: "Kurumx", platform: "YouTube", link: "https://www.youtube.com/@Kurumx", learn: "Structured guides on econ, leveling and comp fundamentals aimed at climbing players.", kind: "teaching", verifiedOn: null },
  { name: "Bebe872", platform: "Twitch", link: "https://www.twitch.tv/bebe872", learn: "Consistent top-4 style; watch how he stabilises boards rather than how he wins them.", kind: "high-level", verifiedOn: null },
  { name: "Setsuko", platform: "Twitch", link: "https://www.twitch.tv/setsuko", learn: "Aggressive tempo play; a counterexample to greed when you have the strongest board.", kind: "high-level", verifiedOn: null },
  { name: "Robinsongz", platform: "Both", link: "https://www.twitch.tv/robinsongz", youtube: "https://www.youtube.com/@robinsongz", learn: "Explains positioning changes between rounds more than most; useful for the counter-positioning habit. Also writes the TFT Handbook.", kind: "teaching", verifiedOn: "2026-09-24" },
  { name: "Wasianiverson", platform: "Both", link: "https://www.youtube.com/@wasianiverson", youtube: "https://www.youtube.com/@wasianiverson", learn: "Full games chaptered by augment round (2-1, 3-2, 4-2, 5-1, 6-1), which makes them the easiest VODs to pause at the decision points. Reroll and flex lines explained as he plays.", kind: "teaching", verifiedOn: "2026-09-24" },
  { name: "Keane", platform: "Both", link: "https://www.twitch.tv/keanelol", youtube: "https://www.youtube.com/@KeaneTFT", learn: "Long-standing Challenger streamer; calm ranked games edited with stage chapters. Good for watching a standard tempo game from start to finish without noise.", kind: "high-level", verifiedOn: "2026-09-24" },
  { name: "shurkou", platform: "YouTube", link: "https://www.youtube.com/@shurkou", youtube: "https://www.youtube.com/@shurkou", learn: "Challenger climb content with full games around one idea per video (an augment, a line). Watch for how a single strong pick reshapes the whole game plan.", kind: "teaching", verifiedOn: "2026-09-24" },
];
