/**
 * npm run sync-wisps
 *
 * Riot does not publish Wisp gold costs or the stages they appear in (the
 * game files only carry name, text and effect numbers). lolchess.gg renders
 * a public table with both, server-side. The English page lists the Wisps in
 * the current pool; the Korean page lists more, so both are read and Korean
 * names are mapped back to English through CommunityDragon's ko_kr data
 * (same apiName in both locales). Writes data/generated/wisps.json. If the
 * page layout changes the script fails loudly and the previous file is kept.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "generated", "wisps.json");
const CURRENT = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "generated", "current.json"), "utf8")) as { setNumber: number };
const PAGE = (hl: string) => `https://lolchess.gg/rewards/set${CURRENT.setNumber}/wisps?hl=${hl}`;
const CDRAGON = (locale: string) => `https://raw.communitydragon.org/latest/cdragon/tft/${locale}.json`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

export interface WispRow {
  name: string;
  cost: number;
  stage: string;
  desc: string;
  /** which page the row came from */
  locale: string;
}
export interface WispsGenerated {
  syncedAt: string;
  source: string;
  wisps: WispRow[];
}

function decode(s: string): string {
  return s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function parseWisps(html: string, locale = "en"): WispRow[] {
  // Descriptions may contain inline tags (Korean page); the stage cell is optional.
  const re = /<div class="base-row"><div class="name-cell">(?:<img[^>]*>)?<strong>([^<]+)<\/strong><\/div><div class="cost-cell">(?:<img[^>]*>)?<strong>(\d+)<\/strong><\/div><div class="description-cell"><p class="description">([\s\S]*?)<\/p><\/div>(?:<div class="stage-cell">([\s\S]*?)<\/div><\/div>)?/g;
  const rows: WispRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    rows.push({ name: decode(m[1]!), cost: Number(m[2]), desc: decode(m[3]!.replace(/<[^>]+>/g, "")), stage: decode((m[4] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).replace(/\s*~\s*/g, " to "), locale });
  }
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+]/g, "");

async function text(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/json" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "generated", `set-${CURRENT.setNumber}.json`), "utf8")) as { items: { kind: string; name: string; id: string }[] };
  const known = new Map(set.items.filter((i) => i.kind === "charm").map((i) => [norm(i.name), i.name]));

  console.log(`→ fetching ${PAGE("en")}`);
  const en = parseWisps(await text(PAGE("en")), "en");
  if (en.length < 50) throw new Error(`only ${en.length} rows parsed from the English page (layout changed?)`);
  const rows = new Map<string, WispRow>();
  for (const r of en) rows.set(norm(r.name), r);

  try {
    console.log(`→ fetching ${PAGE("ko")} and CDragon ko_kr names`);
    const [koHtml, koJson, enJson] = await Promise.all([text(PAGE("ko")), text(CDRAGON("ko_kr")), text(CDRAGON("en_us"))]);
    const koItems = (JSON.parse(koJson) as { items: { apiName: string; name: string | null }[] }).items;
    const enItems = (JSON.parse(enJson) as { items: { apiName: string; name: string | null }[] }).items;
    const enByApi = new Map(enItems.map((i) => [i.apiName, (i.name ?? "").trim()]));
    const koToEn = new Map<string, string>();
    for (const i of koItems) {
      const e = enByApi.get(i.apiName);
      if (i.name && e && known.has(norm(e))) koToEn.set(i.name.trim(), e);
    }
    let added = 0;
    const koRows = parseWisps(koHtml, "ko");
    console.log(`  ${koRows.length} rows on the Korean page (first: ${koRows[0]?.name ?? "—"}); ${koToEn.size} Korean names mapped`);
    for (const r of koRows) {
      const e = koToEn.get(r.name);
      if (!e || rows.has(norm(e))) continue;
      rows.set(norm(e), { ...r, name: e, desc: "" });
      added++;
    }
    console.log(`  ${added} extra wisps from the Korean page`);
  } catch (e) {
    console.log(`  ! Korean page skipped: ${e instanceof Error ? e.message : e}`);
  }

  const all = [...rows.values()].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  const matched = all.filter((r) => known.has(norm(r.name)));
  console.log(`→ ${all.length} wisps, ${matched.length} match the synced set (${known.size} in the set)`);
  const file: WispsGenerated = { syncedAt: new Date().toISOString(), source: PAGE("en"), wisps: all };
  fs.writeFileSync(OUT, JSON.stringify(file, null, 1));
  console.log(`✓ wrote data/generated/wisps.json`);
}

if (process.argv[1] && /sync-wisps/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(`\n✖ sync-wisps failed: ${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  });
}
