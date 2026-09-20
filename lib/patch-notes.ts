import fs from "node:fs";
import path from "node:path";

/** data/generated/patch-notes.json, written by scripts/sync-patch-notes.ts. */
export interface PatchNoteIndex {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  url: string;
  image: string;
  patch: string | null;
}
export interface PatchNote extends PatchNoteIndex {
  html: string;
  headings: { level: 2 | 3; text: string; id: string }[];
}
export interface PatchNotesFile {
  syncedAt: string;
  locale: string;
  source: string;
  index: PatchNoteIndex[];
  notes: PatchNote[];
}

let cached: PatchNotesFile | null | undefined;
export function loadPatchNotes(): PatchNotesFile | null {
  if (cached !== undefined) return cached;
  const f = path.join(process.cwd(), "data", "generated", "patch-notes.json");
  cached = fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as PatchNotesFile) : null;
  return cached;
}

const ALLOWED = new Set(["h2", "h3", "h4", "h5", "p", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "br", "hr", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "img", "a", "span", "div", "sup", "sub", "code", "pre", "figure", "figcaption"]);
const KEEP_ATTR: Record<string, string[]> = { a: ["href"], img: ["src", "alt", "width", "height"], h2: ["id"], h3: ["id"], h4: ["id"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] };

/**
 * Whitelist sanitiser for Riot's article HTML: drops scripts/styles/iframes,
 * unknown tags (keeps their text), every attribute except a few safe ones,
 * and any javascript: URL. Relative links are made absolute.
 */
export function sanitizeHtml(input: string, base = "https://teamfighttactics.leagueoflegends.com"): string {
  let s = input.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|iframe|object|embed|noscript|video|audio)[^>]*>[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g, (m, tagRaw: string, attrs: string) => {
    const tag = tagRaw.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (m.startsWith("</")) return `</${tag}>`;
    const keep = KEEP_ATTR[tag] ?? [];
    const out: string[] = [];
    for (const name of keep) {
      const am = attrs.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
      if (!am) continue;
      let v = (am[2] ?? am[3] ?? am[4] ?? "").trim();
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(v)) continue;
      if ((name === "href" || name === "src") && v.startsWith("/")) v = base + v;
      out.push(`${name}="${v.replace(/"/g, "&quot;")}"`);
    }
    if (tag === "a") out.push('target="_blank" rel="noreferrer"');
    const selfClose = tag === "br" || tag === "hr" || tag === "img";
    return `<${tag}${out.length ? " " + out.join(" ") : ""}${selfClose ? " /" : ""}>`;
  });
  s = s.replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
