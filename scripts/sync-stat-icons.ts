/**
 * Mirror the in-game stat icons (the `%i:scaleAD%` text icons the tooltips
 * use) from CommunityDragon into public/assets/stats/<key>.png.
 *
 *   npm run sync-stat-icons
 *
 * They are set-agnostic, so this runs on demand (and in the daily workflow),
 * not per set. Which file backs which stat is `STAT_ICON_FILES` in
 * lib/stat-meta.ts; this script only downloads.
 */
import path from "node:path";
import { CDRAGON_ROOT } from "../lib/cdragon";
import { mirrorAssets } from "../lib/sync/mirror";
import { STAT_ICON_FILES, STAT_KEYS } from "../lib/stat-meta";

const TEXTICONS = `${CDRAGON_ROOT}/plugins/rcp-be-lol-game-data/global/default/assets/ux/fonts/texticons/`;

async function main() {
  const dir = path.join(process.cwd(), "public", "assets", "stats");
  const jobs = STAT_KEYS.map((k) => ({ url: TEXTICONS + STAT_ICON_FILES[k].source, file: `${STAT_ICON_FILES[k].file}.png` }));
  const res = await mirrorAssets(jobs, dir, { log: (s) => console.log(s) });
  console.log(`stat icons: ${res.downloaded} downloaded, ${res.skipped} up to date`);
  if (res.failed.length) {
    for (const f of res.failed) console.error(`  ✗ ${f.url}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
