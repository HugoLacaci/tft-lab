/**
 * npm run sync-set
 *
 * 1. Fetch CommunityDragon en_us.json (fallback: Data Dragon).
 * 2. Validate the raw shape with Zod. Fail loudly (exit 1) on drift.
 * 3. Detect the live set (highest number; stage mutator preferred).
 * 4. Normalise into lib/types.ts shapes.
 * 5. Mirror every icon into public/assets/set-<n>/ (ETag-aware).
 * 6. Write data/generated/set-<n>.json and data/generated/current.json.
 * 7. Diff against the previous current.json; on a set change write
 *    data/generated/SET_CHANGED and print added/removed champions & traits.
 *
 * Flags:
 *   --source=cdragon|ddragon   force an upstream (default: cdragon, then fallback)
 *   --set=<n>                  pick a specific set number instead of the highest
 *                              (used to simulate a rollover; see README runbook)
 *   --no-assets                skip mirroring (fast local iteration)
 *   --from-file=<path>         read the CDragon JSON from disk instead of the network
 */
import fs from "node:fs";
import path from "node:path";
import { cdragonAsset, CDRAGON_METADATA, CDRAGON_TFT_JSON, localAssetName } from "../lib/cdragon";
import type { CurrentSet, SetData } from "../lib/types";
import { detectLiveSet } from "../lib/sync/detect";
import { mirrorAssets } from "../lib/sync/mirror";
import { collectIconPaths, normalizeCdragon, rewriteIcons } from "../lib/sync/normalize-cdragon";
import { normalizeDdragon } from "../lib/sync/normalize-ddragon";
import { RawCdragon, RawDdAugment, RawDdChampion, RawDdFile, RawDdItem, RawDdTrait } from "../lib/sync/schema";
import { isPlaceholderName } from "../lib/set-meta";

const ROOT = process.cwd();
const GEN = path.join(ROOT, "data", "generated");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const log = (s: string) => console.log(s);
const fail = (s: string): never => {
  console.error(`\n✖ sync-set failed: ${s}\n`);
  process.exit(1);
};

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "user-agent": "tft-lab sync-set (github.com)" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function fromCdragon(): Promise<SetData> {
  log(`→ fetching ${CDRAGON_TFT_JSON}`);
  const raw = args["from-file"] ? JSON.parse(fs.readFileSync(args["from-file"]!, "utf8")) : await fetchJson(CDRAGON_TFT_JSON);
  const parsed = RawCdragon.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 15).map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`CDragon schema drift:\n${issues.join("\n")}\n  (see docs/cdragon-schema.md)`);
  }
  let patch = "unknown";
  try {
    const meta = (await fetchJson(CDRAGON_METADATA)) as { version?: string };
    patch = (meta.version ?? "").split(".").slice(0, 2).join(".") || "unknown";
  } catch {
    log("  ! could not read content-metadata.json; patch=unknown");
  }

  let entry;
  if (args.set) {
    const n = Number(args.set);
    const forced = parsed.data.setData.filter((s) => s.number === n);
    if (forced.length === 0) throw new Error(`--set=${n}: no setData entry with that number`);
    entry = detectLiveSet(forced).entry;
    log(`→ forced set ${n} via --set (mutator ${entry.mutator})`);
  } else {
    const det = detectLiveSet(parsed.data.setData);
    entry = det.entry;
    log(`→ live set: number ${entry.number}, mutator ${entry.mutator} (${det.reason}; candidates: ${det.candidates.join(", ")})`);
  }
  if (isPlaceholderName(entry.name)) {
    log(`  ! upstream set name "${entry.name}" is a placeholder; add displayName to content/sets/${entry.number}/meta.json`);
  }
  const data = normalizeCdragon(entry, parsed.data.items, { patch, syncedAt: new Date().toISOString() });
  sanity(data);
  return data;
}

async function fromDdragon(): Promise<SetData> {
  log("→ fetching Data Dragon (fallback)");
  const versions = (await fetchJson("https://ddragon.leagueoflegends.com/api/versions.json")) as string[];
  const v = versions[0];
  if (!v) throw new Error("ddragon: empty versions.json");
  const base = `https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US`;
  const [c, t, i, a] = await Promise.all([
    fetchJson(`${base}/tft-champion.json`),
    fetchJson(`${base}/tft-trait.json`),
    fetchJson(`${base}/tft-item.json`),
    fetchJson(`${base}/tft-augments.json`),
  ]);
  const pc = RawDdFile(RawDdChampion).parse(c);
  const pt = RawDdFile(RawDdTrait).parse(t);
  const pi = RawDdFile(RawDdItem).parse(i);
  const pa = RawDdFile(RawDdAugment).parse(a);
  const data = normalizeDdragon(v, pc.data, pt.data, pi.data, pa.data, new Date().toISOString());
  sanity(data);
  return data;
}

/** A normalised set must have real content, or the sync is wrong. */
function sanity(d: SetData) {
  const problems: string[] = [];
  if (d.champions.length < 40) problems.push(`only ${d.champions.length} playable champions`);
  if (d.traits.length < 10) problems.push(`only ${d.traits.length} traits`);
  if (d.items.filter((i) => i.kind === "component").length < 8 && d.meta.source === "cdragon")
    problems.push(`only ${d.items.filter((i) => i.kind === "component").length} components`);
  if (d.meta.source === "cdragon") {
    const noTrait = d.champions.filter((c) => c.traits.some((t) => !d.traits.some((tr) => tr.id === t)));
    if (noTrait.length) problems.push(`champions with unresolved trait names: ${noTrait.map((c) => c.id).join(", ")}`);
  }
  if (problems.length) throw new Error(`sanity check failed: ${problems.join("; ")}`);
}

async function main() {
  const source = (args.source as "cdragon" | "ddragon" | undefined) ?? "cdragon";
  let data: SetData;
  if (source === "ddragon") {
    data = await fromDdragon();
  } else {
    try {
      data = await fromCdragon();
    } catch (e) {
      console.error(`  ! CDragon failed: ${e instanceof Error ? e.message : e}`);
      log("→ falling back to Data Dragon");
      data = await fromDdragon();
    }
  }

  const n = data.meta.number;
  const assetDir = path.join(ROOT, "public", "assets", `set-${n}`);
  const publicPrefix = `/assets/set-${n}/`;

  // --- mirror assets --------------------------------------------------------
  if (args["no-assets"] !== "true") {
    const paths = collectIconPaths(data);
    const jobs = paths.map((p) => {
      const url = data.meta.source === "cdragon" ? cdragonAsset(p) : p;
      const file = data.meta.source === "cdragon" ? localAssetName(p) : p.slice(p.lastIndexOf("/") + 1).toLowerCase();
      return { url, file };
    });
    // Two upstream paths can map to the same filename; dedupe by file, warn if the URLs differ.
    const byFile = new Map<string, string>();
    for (const j of jobs) {
      const prev = byFile.get(j.file);
      if (prev && prev !== j.url) log(`  ! filename collision ${j.file}: ${prev} vs ${j.url}`);
      byFile.set(j.file, j.url);
    }
    const unique = [...byFile].map(([file, url]) => ({ file, url }));
    log(`→ mirroring ${unique.length} icons into public/assets/set-${n}/`);
    const r = await mirrorAssets(unique, assetDir, { log });
    log(`  downloaded ${r.downloaded}, skipped ${r.skipped} (etag match), failed ${r.failed.length}`);
    for (const f of r.failed.slice(0, 20)) log(`  ✖ ${f.url}: ${f.error}`);
    if (r.failed.length > unique.length * 0.05) fail(`${r.failed.length} asset downloads failed (>5%)`);
    const fileFor = new Map(jobs.map((j) => [j.url, j.file]));
    data = rewriteIcons(data, (p) => {
      const url = data.meta.source === "cdragon" ? cdragonAsset(p) : p;
      const file = fileFor.get(url)!;
      const failed = r.failed.some((f) => f.url === url);
      return failed ? "" : publicPrefix + file;
    });
  } else {
    log("→ --no-assets: leaving upstream icon paths in place (UI will show placeholders)");
    data = rewriteIcons(data, (p) => (data.meta.source === "cdragon" ? cdragonAsset(p) : p));
  }

  // --- write ----------------------------------------------------------------
  fs.mkdirSync(GEN, { recursive: true });
  const currentFile = path.join(GEN, "current.json");
  const prev: CurrentSet | null = fs.existsSync(currentFile) ? JSON.parse(fs.readFileSync(currentFile, "utf8")) : null;
  const prevSetFile = prev && prev.setNumber > 0 ? path.join(GEN, `set-${prev.setNumber}.json`) : null;
  const prevData: SetData | null = prevSetFile && fs.existsSync(prevSetFile) ? JSON.parse(fs.readFileSync(prevSetFile, "utf8")) : null;

  fs.writeFileSync(path.join(GEN, `set-${n}.json`), JSON.stringify(data, null, 1));
  const current: CurrentSet = {
    setNumber: n,
    setName: data.meta.name,
    mutator: data.meta.mutator,
    syncedAt: data.meta.syncedAt,
    patch: data.meta.patch,
  };
  fs.writeFileSync(currentFile, JSON.stringify(current, null, 2) + "\n");

  log(`\n✓ set ${n} (${data.meta.mutator}, patch ${data.meta.patch}, source ${data.meta.source})`);
  log(`  champions ${data.champions.length} · traits ${data.traits.length} · items ${data.items.length} · augments ${data.augments.length}`);

  // --- diff -----------------------------------------------------------------
  const changedFlag = path.join(GEN, "SET_CHANGED");
  if (prev && prev.setNumber !== n) {
    const added = (cur: { id: string; name: string }[], old: { id: string; name: string }[]) =>
      cur.filter((c) => !old.some((o) => o.id === c.id)).map((c) => c.name);
    const removed = (cur: { id: string; name: string }[], old: { id: string; name: string }[]) =>
      old.filter((o) => !cur.some((c) => c.id === o.id)).map((o) => o.name);
    const oldC = prevData?.champions ?? [];
    const oldT = prevData?.traits ?? [];
    const summary = [
      `SET CHANGED: ${prev.setNumber} → ${n}`,
      ``,
      `Traits added (${added(data.traits, oldT).length}): ${added(data.traits, oldT).join(", ")}`,
      `Traits removed (${removed(data.traits, oldT).length}): ${removed(data.traits, oldT).join(", ")}`,
      ``,
      `Champions added (${added(data.champions, oldC).length}): ${added(data.champions, oldC).join(", ")}`,
      `Champions removed (${removed(data.champions, oldC).length}): ${removed(data.champions, oldC).join(", ")}`,
      ``,
      `Content needing a human pass:`,
      `  content/sets/${n}/meta.json          (displayName)`,
      `  content/sets/${n}/overview.mdx       (set hub prose)`,
      `  data/constants/set-${n}.ts           (XP, interest, odds — verify)`,
      `  content/scenarios/**  with setAgnostic:false and set:${prev.setNumber} (now hidden)`,
    ].join("\n");
    fs.writeFileSync(changedFlag, summary + "\n");
    log(`\n${"=".repeat(72)}\n${summary}\n${"=".repeat(72)}`);
  } else if (fs.existsSync(changedFlag) && prev && prev.setNumber === n) {
    // Same set again: the flag is stale from an earlier run; leave it for the PR
    // workflow to consume (it deletes it after labelling).
  }
}

main().catch((e) => fail(e instanceof Error ? (e.stack ?? e.message) : String(e)));
