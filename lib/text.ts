/**
 * Riot description markup → plain text.
 *
 *   "@AD*100@% Attack Damage"       → "10% Attack Damage"   (value from effects)
 *   "%i:scaleAP%"                    → ""                    (stat icon token)
 *   "<br>", "<row>…</row>", <rules>  → newlines / stripped
 *   "{{TFT_Keyword_Precision}}"      → "[Precision]"          (unresolvable keyword ref)
 *   unresolved "@Foo@"               → "{Foo}"                (kept visible, dimmed by UI)
 */
export type Vars = Record<string, number | null | undefined>;

const KEY_ALIASES: Record<string, string> = {
  // CDragon sometimes hashes keys; a few well-known ones are aliased here.
};

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 100) / 100;
  return String(r);
}

/** Stat-icon token → short marker label. Unknown tokens keep their name. */
export const ICON_LABELS: Record<string, string> = {
  scaleAD: "AD",
  scaleAP: "AP",
  scaleHealth: "HP",
  scaleArmor: "Armor",
  scaleMR: "MR",
  scaleAS: "AS",
  scaleMana: "Mana",
  scaleRange: "Range",
  scaleCrit: "Crit",
  scaleCritMult: "Crit dmg",
  scaleDA: "Dmg amp",
  scaleDR: "Durability",
  scaleOmnivamp: "Omnivamp",
  scaleSV: "Omnivamp",
  scaleLevel: "Level",
  scaleStar: "Star",
  TFTManaRegen: "Mana regen",
  TFTBonusManaRegen: "Mana regen",
};

/** Like renderDesc but keeps stat icons as `[[AD]]`-style markers for the UI to render as badges. */
export function renderDescRich(raw: string | null | undefined, vars: Vars = {}): string {
  if (!raw) return "";
  const kept = raw.replace(/%i:([a-zA-Z0-9_]+)%/g, (_m, k: string) => `[[${ICON_LABELS[k] ?? k.replace(/^scale/, "")}]]`);
  return renderDesc(kept, vars)
    .replace(/[ \t]*(\[\[[^\]]+\]\])[ \t]*/g, " $1 ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ \n/g, "\n")
    .replace(/\n /g, "\n")
    .trim();
}

export function renderDesc(raw: string | null | undefined, vars: Vars = {}): string {
  if (!raw) return "";
  let s = raw;
  s = s.replace(/\r\\n|\\n|\r\n|\r/g, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/row>/gi, "\n").replace(/<row>/gi, "");
  s = s.replace(/<rules>/gi, "\n").replace(/<\/rules>/gi, "");
  s = s.replace(/%i:[a-zA-Z0-9_]+%/g, "");
  s = s.replace(/\{\{([^}]+)\}\}/g, (_m, k: string) => `[${k.replace(/^TFT_Keyword_/, "")}]`);
  s = s.replace(/@([^@*]+?)(\*(-?\d+(?:\.\d+)?))?@/g, (_m, key: string, _g, mult?: string) => {
    const k = KEY_ALIASES[key] ?? key;
    const v = vars[k];
    if (typeof v === "number") return fmt(mult ? v * Number(mult) : v);
    return `{${key}}`;
  });
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

/** Split a trait description's per-breakpoint rows out, in order. */
export function traitRows(raw: string): { intro: string; rows: string[] } {
  const rows: string[] = [];
  const re = /<row>([\s\S]*?)<\/row>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) rows.push(m[1]!);
  const intro = raw.replace(/<row>[\s\S]*?<\/row>/gi, "");
  return { intro, rows };
}
