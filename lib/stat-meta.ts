/**
 * The combat stats TFT draws an icon for, with their colours and the words
 * and markers that refer to them. Pure data + text helpers; the SVG glyphs
 * live in components/set/StatIcon.tsx.
 *
 * Two ways a stat shows up in text:
 *   - `[[AD]]` markers left by renderDescRich (from CDragon's %i:scaleAD% tokens)
 *   - plain words in augment, trait and guide prose ("Attack Damage", "Armor")
 */
export type StatKey =
  | "AD"
  | "AP"
  | "HP"
  | "Armor"
  | "MR"
  | "AS"
  | "Mana"
  | "Mana regen"
  | "Crit"
  | "Crit dmg"
  | "Dmg amp"
  | "Durability"
  | "Omnivamp"
  | "Lifesteal"
  | "Range"
  | "Gold"
  | "Level"
  | "Star";

export interface StatMeta {
  /** Short label as the in-game stat bar shows it. */
  label: string;
  /** Full name for tooltips and screen readers. */
  name: string;
  /** Icon colour, mirroring the in-game tooltip palette. */
  color: string;
}

export const STATS: Record<StatKey, StatMeta> = {
  AD: { label: "AD", name: "Attack Damage", color: "#ff9a3c" },
  AP: { label: "AP", name: "Ability Power", color: "#3fa9f5" },
  HP: { label: "HP", name: "Health", color: "#38c172" },
  Armor: { label: "Armor", name: "Armor", color: "#ffb642" },
  MR: { label: "MR", name: "Magic Resist", color: "#c9a6ff" },
  AS: { label: "AS", name: "Attack Speed", color: "#f5d33f" },
  Mana: { label: "Mana", name: "Mana", color: "#4fc3f7" },
  "Mana regen": { label: "Mana regen", name: "Mana Regeneration", color: "#4fc3f7" },
  Crit: { label: "Crit", name: "Critical Strike Chance", color: "#e0483a" },
  "Crit dmg": { label: "Crit dmg", name: "Critical Strike Damage", color: "#e0483a" },
  "Dmg amp": { label: "Dmg amp", name: "Damage Amplification", color: "#ff6b57" },
  Durability: { label: "Durability", name: "Durability", color: "#a3b0bd" },
  Omnivamp: { label: "Omnivamp", name: "Omnivamp", color: "#e05a8a" },
  Lifesteal: { label: "Lifesteal", name: "Lifesteal", color: "#e05a8a" },
  Range: { label: "Range", name: "Attack Range", color: "#a3b0bd" },
  Gold: { label: "Gold", name: "Gold", color: "#f0c419" },
  Level: { label: "Level", name: "Level", color: "#c8aa6e" },
  Star: { label: "Star", name: "Star level", color: "#ffb642" },
};

export const STAT_KEYS = Object.keys(STATS) as StatKey[];

/**
 * The in-game text icon behind each stat: `source` is the path under
 * CommunityDragon's `assets/ux/fonts/texticons/` (the files the client's
 * `%i:scaleAD%` tokens resolve to), `file` the local name under
 * public/assets/stats/. Mirrored by `npm run sync-stat-icons`.
 */
export const STAT_ICON_FILES: Record<StatKey, { source: string; file: string }> = {
  AD: { source: "lol/statsicon/scalead.png", file: "scalead" },
  AP: { source: "lol/statsicon/scaleap.png", file: "scaleap" },
  HP: { source: "lol/statsicon/scalehealth.png", file: "scalehealth" },
  Armor: { source: "lol/statsicon/scalearmor.png", file: "scalearmor" },
  MR: { source: "lol/statsicon/scalemr.png", file: "scalemr" },
  AS: { source: "lol/statsicon/scaleas.png", file: "scaleas" },
  Mana: { source: "lol/statsicon/scalemana.png", file: "scalemana" },
  "Mana regen": { source: "tft/tft_manaregenicon.png", file: "tft_manaregenicon" },
  Crit: { source: "lol/statsicon/scalecrit.png", file: "scalecrit" },
  "Crit dmg": { source: "lol/statsicon/scalecritmult.png", file: "scalecritmult" },
  "Dmg amp": { source: "lol/statsicon/scaleda.png", file: "scaleda" },
  Durability: { source: "lol/statsicon/scaledr.png", file: "scaledr" },
  Omnivamp: { source: "lol/statsicon/scalesv.png", file: "scalesv" },
  Lifesteal: { source: "lol/statsicon/scalels.png", file: "scalels" },
  Range: { source: "lol/statsicon/scalerange.png", file: "scalerange" },
  Gold: { source: "lol/gameplay/goldcoins.png", file: "goldcoins" },
  Level: { source: "lol/statsicon/scalelevel.png", file: "scalelevel" },
  Star: { source: "lol/gameplay/star.png", file: "star" },
};

/** Site-local path of a stat's icon (prefix with `asset()` when rendering). */
export function statIconPath(stat: StatKey): string {
  return `/assets/stats/${STAT_ICON_FILES[stat].file}.png`;
}

/** Marker labels renderDescRich emits (see ICON_LABELS in lib/text.ts) plus a few upstream token names. */
const MARKER_ALIASES: Record<string, StatKey> = {
  goldcoins: "Gold",
  gold: "Gold",
  health: "HP",
  hp: "HP",
  ad: "AD",
  ap: "AP",
  armor: "Armor",
  mr: "MR",
  as: "AS",
  mana: "Mana",
  "mana regen": "Mana regen",
  crit: "Crit",
  "crit dmg": "Crit dmg",
  critmult: "Crit dmg",
  "dmg amp": "Dmg amp",
  da: "Dmg amp",
  durability: "Durability",
  dr: "Durability",
  omnivamp: "Omnivamp",
  sv: "Omnivamp",
  lifesteal: "Lifesteal",
  range: "Range",
  level: "Level",
  star: "Star",
};

/** `[[AD]]` marker label → stat, or null for markers we have no icon for. */
export function statOfMarker(label: string): StatKey | null {
  return MARKER_ALIASES[label.trim().toLowerCase()] ?? null;
}

/**
 * Words that name a stat in prose. Longer phrases first so "Mana Regen" wins
 * over "Mana" and "Magic Resist" over "MR". Phrases match in any case;
 * abbreviations only in upper case (the word "as" must not become an Attack
 * Speed icon), which the `exact` flag enforces after the combined match.
 */
const WORD_RULES: { re: string; stat: StatKey; exact?: boolean }[] = [
  { re: "mana regen(?:eration)?", stat: "Mana regen" },
  { re: "attack damage", stat: "AD" },
  { re: "ability power", stat: "AP" },
  { re: "(?:max(?:imum)? |bonus )?health", stat: "HP" },
  { re: "magic resist(?:ance)?", stat: "MR" },
  { re: "attack speed", stat: "AS" },
  { re: "crit(?:ical)?(?: strike)? damage", stat: "Crit dmg" },
  { re: "crit(?:ical)?(?: strike)?(?: chance)?", stat: "Crit" },
  { re: "damage amp(?:lification)?", stat: "Dmg amp" },
  { re: "durability", stat: "Durability" },
  { re: "omnivamp", stat: "Omnivamp" },
  { re: "life ?steal", stat: "Lifesteal" },
  { re: "armou?r", stat: "Armor" },
  { re: "mana", stat: "Mana" },
  { re: "AD", stat: "AD", exact: true },
  { re: "AP", stat: "AP", exact: true },
  { re: "HP", stat: "HP", exact: true },
  { re: "MR", stat: "MR", exact: true },
  { re: "AS", stat: "AS", exact: true },
];

/** One capture group per rule so the match tells us which rule fired. */
const WORD_RE_SOURCE = `\\b(?:${WORD_RULES.map((r) => `(${r.re})`).join("|")})\\b`;

export type StatWordPart = string | { stat: StatKey; text: string };

/**
 * Split prose into plain strings and `{ stat, text }` parts for every stat
 * word, in order. Text that names no stat comes back as a single string.
 */
export function splitStatWords(text: string): StatWordPart[] {
  const out: StatWordPart[] = [];
  const re = new RegExp(WORD_RE_SOURCE, "gi");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const word = m[0];
    const idx = WORD_RULES.findIndex((_r, i) => m![i + 1] !== undefined);
    const rule = WORD_RULES[idx];
    if (!rule || (rule.exact && word !== rule.re)) continue; // "as", "ad" in lower case: not a stat
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ stat: rule.stat, text: word });
    last = m.index + word.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
