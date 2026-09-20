/**
 * npm run sync-meta
 *
 * Builds data/generated/meta.json from Riot's own match API: samples the top
 * ladder (Challenger + Grandmaster) on a few platforms, reads their recent
 * ranked games and aggregates item, unit and comp statistics. Needs
 * RIOT_API_KEY (a personal/production key for CI; a dev key works locally).
 *
 * What it can and cannot derive:
 *   - items:    average placement + pick rate per completed/artifact/radiant
 *               item → S–F rank by quantile (feeds the badges).
 *   - units:    average placement, pick rate, 3★ rate, most common items.
 *   - comps:    clusters by the two strongest active traits on the final
 *               board → average placement, top-4 rate, core units, items.
 *   - augments: NOT possible — Riot removed augments from match data in 2024.
 *   - wisps:    NOT possible — not in match data.
 *
 * Flags: --platforms=euw1,na1,kr  --players=40  --matches=8  --min=20
 */
import fs from "node:fs";
import path from "node:path";
import { RiotClient, regionOf } from "../lib/riot/client";
import type { LeagueEntryDto, MatchDto, Platform } from "../lib/riot/types";
import type { SetData } from "../lib/types";
import type { MetaFile, MetaItem, MetaUnit, MetaComp, Rank } from "../lib/meta";
import { rankByPlacement } from "../lib/meta";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "generated", "meta.json");
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const PLATFORMS = (args.platforms ?? "euw1,na1,kr").split(",") as Platform[];
const PLAYERS = Number(args.players ?? 40);
const MATCHES = Number(args.matches ?? 8);
const MIN = Number(args.min ?? 20);
const KEY = process.env.RIOT_API_KEY ?? "";

interface LadderDto {
  entries: (LeagueEntryDto & { puuid?: string; summonerId?: string })[];
}

const log = (s: string) => console.log(s);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadSet(): SetData {
  const cur = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "generated", "current.json"), "utf8")) as { setNumber: number };
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "generated", `set-${cur.setNumber}.json`), "utf8")) as SetData;
}

async function ladder(client: RiotClient, platform: Platform): Promise<string[]> {
  const puuids: string[] = [];
  for (const tier of ["challenger", "grandmaster"]) {
    try {
      const d = await client.request<LadderDto>(platform, `/tft/league/v1/${tier}`);
      for (const e of d.entries) if (e.puuid) puuids.push(e.puuid);
    } catch (e) {
      log(`  ! ${platform} ${tier}: ${e instanceof Error ? e.message : e}`);
    }
    if (puuids.length >= PLAYERS) break;
  }
  return puuids.slice(0, PLAYERS);
}

async function main() {
  if (!KEY) throw new Error("RIOT_API_KEY is not set");
  const set = loadSet();
  const componentIds = new Set(set.items.filter((i) => i.kind === "component").map((i) => i.id));
  const itemById = new Map(set.items.map((i) => [i.id.toLowerCase(), i]));
  const unitById = new Map(set.champions.map((c) => [c.id.toLowerCase(), c]));
  const traitName = new Map(set.traits.map((t) => [t.id, t.name]));

  const matches = new Map<string, MatchDto>();
  for (const platform of PLATFORMS) {
    const client = new RiotClient({ apiKey: KEY, platform });
    log(`→ ${platform}: reading the ladder`);
    const puuids = await ladder(client, platform);
    log(`  ${puuids.length} players; listing matches`);
    const ids = new Set<string>();
    for (const p of puuids) {
      try {
        for (const id of await client.matchIds(p, MATCHES)) ids.add(id);
      } catch (e) {
        log(`  ! ids ${p.slice(0, 8)}: ${e instanceof Error ? e.message : e}`);
      }
      await sleep(60);
    }
    const fresh = [...ids].filter((id) => !matches.has(id));
    log(`  ${fresh.length} matches to fetch (${regionOf(platform)})`);
    const { ok, failed } = await client.matches(fresh, 2, (d, t) => {
      if (d % 50 === 0) log(`  … ${d}/${t}`);
    });
    for (const m of ok) matches.set(m.metadata.match_id, m);
    if (failed.length) log(`  ! ${failed.length} failed`);
  }

  const all = [...matches.values()].filter((m) => (m.info.queue_id ?? m.info.queueId) === 1100 && m.info.tft_set_number === set.meta.number);
  log(`→ ${all.length} ranked set-${set.meta.number} matches`);
  if (all.length < 30) throw new Error("too few matches to aggregate");
  const patch = mostCommon(all.map((m) => (m.info.game_version ?? "").match(/(\d+\.\d+)/)?.[1] ?? "?"));

  // --- items
  const itemAcc = new Map<string, { n: number; sum: number; top4: number }>();
  const unitAcc = new Map<string, { n: number; sum: number; top4: number; three: number; items: Map<string, number> }>();
  const compAcc = new Map<string, { n: number; sum: number; top4: number; wins: number; units: Map<string, number>; items: Map<string, Map<string, number>>; traits: Map<string, number> }>();
  let players = 0;
  for (const m of all) {
    for (const p of m.info.participants) {
      players++;
      const top = p.placement <= 4 ? 1 : 0;
      const seenItems = new Set<string>();
      for (const u of p.units ?? []) {
        const uid = u.character_id;
        const ua = unitAcc.get(uid) ?? { n: 0, sum: 0, top4: 0, three: 0, items: new Map() };
        ua.n++;
        ua.sum += p.placement;
        ua.top4 += top;
        if (u.tier >= 3) ua.three++;
        for (const it of u.itemNames ?? []) {
          if (componentIds.has(it) || /Component|Spatula|FryingPan|Consumable|Assist|Remover|Reforger|Duplicator/i.test(it)) continue;
          ua.items.set(it, (ua.items.get(it) ?? 0) + 1);
          if (!seenItems.has(it)) {
            seenItems.add(it);
            const ia = itemAcc.get(it) ?? { n: 0, sum: 0, top4: 0 };
            ia.n++;
            ia.sum += p.placement;
            ia.top4 += top;
            itemAcc.set(it, ia);
          }
        }
        unitAcc.set(uid, ua);
      }
      const active = (p.traits ?? []).filter((t) => t.style > 0).sort((a, b) => b.style * 100 + b.num_units - (a.style * 100 + a.num_units));
      if (active.length < 2) continue;
      const key = active
        .slice(0, 2)
        .map((t) => t.name)
        .sort()
        .join("+");
      const ca = compAcc.get(key) ?? { n: 0, sum: 0, top4: 0, wins: 0, units: new Map(), items: new Map(), traits: new Map() };
      ca.n++;
      ca.sum += p.placement;
      ca.top4 += top;
      if (p.placement === 1) ca.wins++;
      for (const u of p.units ?? []) {
        ca.units.set(u.character_id, (ca.units.get(u.character_id) ?? 0) + 1);
        const im = ca.items.get(u.character_id) ?? new Map<string, number>();
        for (const it of u.itemNames ?? []) if (!componentIds.has(it)) im.set(it, (im.get(it) ?? 0) + 1);
        ca.items.set(u.character_id, im);
      }
      for (const t of active) ca.traits.set(`${t.name}:${t.num_units}`, (ca.traits.get(`${t.name}:${t.num_units}`) ?? 0) + 1);
      compAcc.set(key, ca);
    }
  }

  const canonicalItem = (id: string) => itemById.get(id.toLowerCase())?.id ?? set.items.find((i) => i.name.toLowerCase() === (itemById.get(id.toLowerCase())?.name ?? "").toLowerCase())?.id ?? id;
  const items: MetaItem[] = [...itemAcc]
    .filter(([, a]) => a.n >= MIN)
    .map(([id, a]) => ({ id: canonicalItem(id), name: itemById.get(id.toLowerCase())?.name ?? id, games: a.n, avg: round(a.sum / a.n), top4: round(a.top4 / a.n, 3), pick: round(a.n / players, 4), rank: "C" as Rank }));
  const ranked = rankByPlacement(items);
  const units: MetaUnit[] = [...unitAcc]
    .filter(([, a]) => a.n >= MIN)
    .map(([id, a]) => ({
      id: unitById.get(id.toLowerCase())?.id ?? id,
      name: unitById.get(id.toLowerCase())?.name ?? id,
      games: a.n,
      avg: round(a.sum / a.n),
      top4: round(a.top4 / a.n, 3),
      pick: round(a.n / players, 4),
      threeStar: round(a.three / a.n, 3),
      items: [...a.items].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([it]) => canonicalItem(it)),
    }))
    .sort((a, b) => a.avg - b.avg);
  const comps: MetaComp[] = [...compAcc]
    .filter(([, a]) => a.n >= MIN)
    .map(([key, a]) => {
      const coreUnits = [...a.units]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 8)
        .map(([uid, n]) => ({ id: unitById.get(uid.toLowerCase())?.id ?? uid, freq: round(n / a.n, 2), items: [...(a.items.get(uid) ?? new Map<string, number>())].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([it]) => canonicalItem(it)) }));
      const traits = [...a.traits].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => ({ id: k.split(":")[0]!, count: Number(k.split(":")[1]) }));
      return {
        key,
        name: key
          .split("+")
          .map((t) => traitName.get(t) ?? t)
          .join(" + "),
        games: a.n,
        avg: round(a.sum / a.n),
        top4: round(a.top4 / a.n, 3),
        win: round(a.wins / a.n, 3),
        pick: round(a.n / players, 4),
        traits,
        units: coreUnits,
      };
    })
    .sort((a, b) => a.avg - b.avg);

  const file: MetaFile = { syncedAt: new Date().toISOString(), set: set.meta.number, patch, platforms: PLATFORMS, matches: all.length, players, items: ranked, units, comps };
  fs.writeFileSync(OUT, JSON.stringify(file, null, 1));
  log(`✓ wrote data/generated/meta.json: ${ranked.length} items, ${units.length} units, ${comps.length} comps from ${all.length} matches (patch ${patch})`);
}

function round(x: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
function mostCommon(xs: string[]): string {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "?";
}

main().catch((e) => {
  console.error(`\n✖ sync-meta failed: ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
