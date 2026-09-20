/**
 * npm run sync-patch-notes
 *
 * Reads Riot's TFT "Game Updates" news page (a Next.js site: the article list
 * and each article body are in the page's __NEXT_DATA__ JSON), keeps the
 * patch-note articles, fetches the body of the newest ones and writes
 * data/generated/patch-notes.json. No API key; public pages only.
 *
 * Flags: --count=<n> bodies to fetch (default 8), --locale=en-us
 */
import fs from "node:fs";
import path from "node:path";
import { sanitizeHtml } from "../lib/patch-notes";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "generated", "patch-notes.json");
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const LOCALE = args.locale ?? "en-us";
const COUNT = Number(args.count ?? 8);
const BASE = "https://teamfighttactics.leagueoflegends.com";
const UA = "tft-lab sync-patch-notes (github.com)";

export interface PatchNoteIndex {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  url: string;
  image: string;
  /** "18.2" when the title names a patch */
  patch: string | null;
}
export interface PatchNote extends PatchNoteIndex {
  html: string;
  /** h2/h3 headings in order, for a table of contents */
  headings: { level: 2 | 3; text: string; id: string }[];
}
export interface PatchNotesFile {
  syncedAt: string;
  locale: string;
  source: string;
  index: PatchNoteIndex[];
  notes: PatchNote[];
}

async function html(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function nextData(page: string): unknown {
  const m = page.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no __NEXT_DATA__ on page (site changed?)");
  return JSON.parse(m[1]!);
}

/** Depth-first search for every array of objects that look like news cards. */
function findCards(o: unknown, out: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 8 || !o || typeof o !== "object") return out;
  if (Array.isArray(o)) {
    if (o.length && o.every((x) => x && typeof x === "object" && "title" in x && "action" in x)) out.push(...(o as Record<string, unknown>[]));
    else for (const x of o) findCards(x, out, depth + 1);
    return out;
  }
  for (const v of Object.values(o as Record<string, unknown>)) findCards(v, out, depth + 1);
  return out;
}

/** Depth-first search for the article's rich-text body. */
function findBody(o: unknown, depth = 0): string | null {
  if (depth > 8 || !o || typeof o !== "object") return null;
  if (!Array.isArray(o)) {
    const r = o as Record<string, unknown>;
    if (r.richText && typeof r.richText === "object" && typeof (r.richText as Record<string, unknown>).body === "string") return (r.richText as Record<string, string>).body!;
    if (typeof r.body === "string" && r.body.length > 2000 && /<p|<h2/.test(r.body)) return r.body;
  }
  for (const v of Array.isArray(o) ? o : Object.values(o as Record<string, unknown>)) {
    const b = findBody(v, depth + 1);
    if (b) return b;
  }
  return null;
}

function patchOf(title: string): string | null {
  const m = title.match(/patch\s+(\d+\.\d+[a-z]?)/i);
  return m ? m[1]! : null;
}

function headingsOf(h: string): PatchNote["headings"] {
  const out: PatchNote["headings"] = [];
  const re = /<h([23])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h)) !== null) {
    const text = m[3]!.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (text) out.push({ level: Number(m[1]) as 2 | 3, text, id: m[2]! });
  }
  return out;
}

async function main() {
  const listUrl = `${BASE}/${LOCALE}/news/game-updates/`;
  console.log(`→ fetching ${listUrl}`);
  const cards = findCards(nextData(await html(listUrl)));
  const index: PatchNoteIndex[] = [];
  const seen = new Set<string>();
  for (const c of cards) {
    const action = c.action as { payload?: { url?: string } } | undefined;
    const url = action?.payload?.url ?? "";
    const title = String(c.title ?? "");
    if (!url || !title || seen.has(url)) continue;
    if (!url.startsWith("/") && !url.startsWith(BASE)) continue; // videos and external links
    if (!/patch|update|overview|notes/i.test(title)) continue;
    seen.add(url);
    const analytics = c.analytics as { publishDate?: string } | undefined;
    const media = (c.imageMedia ?? c.media) as { url?: string } | undefined;
    index.push({
      slug: url.split("/").filter(Boolean).pop()!,
      title,
      description: typeof c.description === "string" ? c.description : typeof (c.description as { body?: unknown } | undefined)?.body === "string" ? String((c.description as { body: string }).body).replace(/<[^>]+>/g, "").trim() : "",
      publishedAt: String(c.publishedAt ?? analytics?.publishDate ?? ""),
      url: url.startsWith("http") ? url : `${BASE}${url}`,
      image: media?.url ?? "",
      patch: patchOf(title),
    });
  }
  index.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (index.length === 0) throw new Error("no patch-note cards found (site changed?)");
  console.log(`→ ${index.length} update articles; fetching ${Math.min(COUNT, index.length)} bodies`);

  const prev: PatchNotesFile | null = fs.existsSync(OUT) ? (JSON.parse(fs.readFileSync(OUT, "utf8")) as PatchNotesFile) : null;
  const notes: PatchNote[] = [];
  for (const it of index.slice(0, COUNT)) {
    const cached = prev?.notes.find((n) => n.slug === it.slug && n.publishedAt === it.publishedAt);
    if (cached) {
      notes.push({ ...cached, ...it });
      continue;
    }
    try {
      const body = findBody(nextData(await html(it.url)));
      if (!body) {
        console.log(`  ! ${it.slug}: no body found`);
        continue;
      }
      const clean = sanitizeHtml(body);
      notes.push({ ...it, html: clean, headings: headingsOf(clean) });
      console.log(`  ✓ ${it.slug} (${Math.round(clean.length / 1024)} KB)`);
    } catch (e) {
      console.log(`  ! ${it.slug}: ${e instanceof Error ? e.message : e}`);
    }
  }
  const file: PatchNotesFile = { syncedAt: new Date().toISOString(), locale: LOCALE, source: listUrl, index: index.slice(0, 40), notes };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(file, null, 1));
  console.log(`✓ wrote ${path.relative(ROOT, OUT)}: ${notes.length} notes, newest "${notes[0]?.title ?? "—"}"`);
}

main().catch((e) => {
  console.error(`\n✖ sync-patch-notes failed: ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
