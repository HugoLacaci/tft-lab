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
}

export const CREATORS: Creator[] = [
  { name: "Mortdog", platform: "Twitch", link: "https://www.twitch.tv/mortdog", learn: "The lead designer playing his own game and explaining why systems are tuned the way they are. Best source for what a patch is trying to do.", kind: "teaching", verifiedOn: null },
  { name: "Frodan", platform: "YouTube", link: "https://www.youtube.com/@Frodan", learn: "Patch rundowns and tier lists with the reasoning attached; co-curates the TFT Academy comps.", kind: "teaching", verifiedOn: null },
  { name: "Dishsoap", platform: "Twitch", link: "https://www.twitch.tv/dishsoap", learn: "Top-ladder play with occasional explanation of level and roll timings; co-curates TFT Academy.", kind: "high-level", verifiedOn: null },
  { name: "k3soju", platform: "Twitch", link: "https://www.twitch.tv/k3soju", learn: "Very high-level flexible play. Watch how early he commits or refuses to commit, not the comps.", kind: "high-level", verifiedOn: null },
  { name: "Milk", platform: "Twitch", link: "https://www.twitch.tv/milk", learn: "Talks through decisions constantly; good for hearing the scout-then-position loop in real time.", kind: "teaching", verifiedOn: null },
  { name: "Kurumx", platform: "YouTube", link: "https://www.youtube.com/@Kurumx", learn: "Structured guides on econ, leveling and comp fundamentals aimed at climbing players.", kind: "teaching", verifiedOn: null },
  { name: "Bebe872", platform: "Twitch", link: "https://www.twitch.tv/bebe872", learn: "Consistent top-4 style; watch how he stabilises boards rather than how he wins them.", kind: "high-level", verifiedOn: null },
  { name: "Setsuko", platform: "Twitch", link: "https://www.twitch.tv/setsuko", learn: "Aggressive tempo play; a counterexample to greed when you have the strongest board.", kind: "high-level", verifiedOn: null },
  { name: "Robinsongz", platform: "Twitch", link: "https://www.twitch.tv/robinsongz", learn: "Explains positioning changes between rounds more than most; useful for the counter-positioning habit.", kind: "teaching", verifiedOn: null },
];
