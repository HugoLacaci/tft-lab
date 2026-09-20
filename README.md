# TFT Lab

A static, self-updating study site for Teamfight Tactics players climbing from Emerald/Diamond to Master+ and competitive play. Three pillars:

- **Guides** — set-agnostic fundamentals (economy, leveling, rolling, items, augments, positioning, scouting, HP, stage plan, pivoting) plus a hub for the live set generated from game data.
- **Trainer** — decision drills on a real hex board with scoring, explanations and spaced repetition.
- **Path** — a weekly routine, a personal game tracker (localStorage, optionally fed by your own Riot match history), and the ladder → Trials → Pro Circuit pathway.
- **Lab** — odds and econ calculators, a printable cheat sheet, and a team planner: every champion, item and augment of the live set on the real board, an enemy board opposite, and a Monte-Carlo fight simulator.

It is **not** a meta/stats site. Its statistics come from the official Riot API (top-ladder matches for the item/comp numbers, your own games for the tracker), and it links to MetaTFT, tactics.tools and the rest instead of scraping them. The one exception is Wisp gold costs, which Riot does not publish anywhere: they are read from lolchess's public table (`npm run sync-wisps`).

## Team planner & fight simulator (`/lab/board`)

Planner and Versus modes. Drag champions and items from the pickers onto the board (or click to auto-place: ranged units go to the back row, melee to the front), drag between hexes, ✕ on a unit removes it, click a unit to set its star level and up to three items, pick up to three augments per side (tagged Combat/Gold/Item/Shop/Trait like the augments page). An in-game style trait column sits left of each half, coloured by the tier reached; it counts emblems and Crest/Crown augments. Pickers show the same hover cards as the set hub (hold ~1 s). **Simulate fight** runs `lib/sim` N times and reports win rate, survivors, fight length and damage dealt/taken/healed per unit.

The simulator is an estimate, not the client: base stats, attack speed, crit, range, mana and item effects come from the synced data (`stats.attackSpeed`, `ability.scaling`, `items[].effects`, `items[].associatedTraits` were added to the normaliser for this); Riot ships no ability numbers, so abilities are modelled by cost and star and by the stat their text scales with, traits by breakpoint tier and augments by tier and wording. Named items with real behaviour are listed in the page's "How the fight is estimated" panel. State persists in `localStorage` (`tftlab.planner.v1`) and **Copy link** puts it in the URL hash.

## Set hub extras

- **Hover cards** (`components/set/hovers.tsx`): champions and items show an in-game style tooltip after ~1 s; ability and item text keep the stat icons as coloured badges (`renderDescRich`).
- **Tags** (`lib/tags.ts`): augments and wisps are tagged Combat / Gold / Item / Shop / Trait / Utility from their text and filterable by tag.
- **Wisps** (`/set/wisps`): the set mechanic entries (`kind: "charm"` in the normaliser, CDragon tag `{5b609ae2}`). Gold costs are not in the game files; `content/sets/<n>/wisps.json` holds guide-sourced costs and the page sorts by cost.
- **Comps** (`/set/comps`, `content/sets/<n>/comps.json`, schema in `lib/comps.ts`): hand-curated tier list with board positioning (rendered on the real board), carries and items, flex/extra units, augments and how to play; every id is validated against the synced set. "Open in the team planner" loads the board into `/lab/board`.
- **Strength tiers** (`content/sets/<n>/tiers.json`, `lib/tiers.ts`): S–F badges for items and augments this patch, keyed by name, shown in the set hub, the comps guide and the planner pickers. Curated by hand; re-verify each patch.
- **Live meta** (`npm run sync-meta`, needs `RIOT_API_KEY`; the workflow runs it when the `RIOT_API_KEY` repository secret exists): samples Challenger/Grandmaster players on EUW, NA and KR, reads their recent ranked games and writes `data/generated/meta.json` with per-item average placement and pick rate (→ S–F ranks by quantile, shown on the items page and in the hover cards), per-unit stats, and comp clusters by the two strongest traits (→ the "Live meta" section of `/set/comps`, and a live average on each curated comp that matches a cluster). Augments cannot be derived (Riot removed them from match data in 2024) and Wisps are not in match data, so their tiers stay curated.
- **Wisp costs** (`npm run sync-wisps`, daily): cost and appearance stage per Wisp into `data/generated/wisps.json`, read from lolchess's English and Korean tables (the Korean one lists the whole pool; names map back through CommunityDragon's `ko_kr` data); the curated `content/sets/<n>/wisps.json` fills any gap.
- **Summons** (`content/sets/<n>/summons.json`, `lib/summons.ts`): dummies, PvE monsters and Elderwood plants as pseudo-champions for the planner; the plants' numbers are estimates because Riot ships none.
- **Patch notes** (`/set/patch-notes`): `npm run sync-patch-notes` reads Riot's game-updates page (`__NEXT_DATA__`), keeps the patch articles, sanitises their HTML with a whitelist (`lib/patch-notes.ts`) and writes `data/generated/patch-notes.json`; the daily sync workflow runs it.

## Riot match history in the tracker (`/tracker`)

Enter `Name#TAG`, the region and an API key from [developer.riotgames.com](https://developer.riotgames.com) (a development key works and expires every 24 h; a personal key is permanent). The browser calls `api.riotgames.com` directly (the API answers CORS with `*` and takes the key as `?api_key=`), so there is still no backend; the key and the cached games live only in `localStorage` (`tftlab.riot.v1`). Fetched games are merged into the manual log (source `riot`) so the charts and the Daily 10 weighting include them, and you can still tag a leak per game.

`lib/riot/analyze.ts` keeps a compact lobby snapshot per game (7 opponents: placement, level, gold, items, stars, comp) and turns the games into a report: eight 0–100 scores (placement, consistency, tempo, economy, items, board cap, aggression, flexibility) drawn as a radar, a per-game review (leaks and strengths against the lobby average and the 1st place), personalised multiple-choice exercises built from the player's own games (`lib/riot/exercises.ts`), and a training focus (`lib/focus.ts`, localStorage `tftlab.focus.v1`) that the Daily 10 merges into its category weights. It also reports placement rates and trend, exits by stage/level/gold left, completed items on the board in top-4 vs bottom-4 games, comps named by their two strongest traits, most-played units, and rule-based findings (going well / going wrong / what to work on) that link to the matching trainer category and guide. Riot stopped shipping augments in match data in early 2024, so they are not analysed.

## Stack

Next.js 15 (App Router, `output: 'export'`), TypeScript strict, Tailwind v4 with CSS tokens, MDX via `@mdx-js/mdx`, Zustand + localStorage, `@dnd-kit` for the board, Vitest, Playwright. No backend, no database, no auth.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `validate` then static export to `out/` |
| `npm run sync-set` | Fetch the live set from CommunityDragon (fallback Data Dragon), mirror icons, write `data/generated/` |
| `npm run sync-patch-notes` | Mirror Riot's TFT patch notes into `data/generated/patch-notes.json` |
| `npm run sync-wisps` | Wisp gold costs and stages into `data/generated/wisps.json` |
| `npm run sync-meta` | Item / unit / comp statistics from top-ladder Riot matches into `data/generated/meta.json` (needs `RIOT_API_KEY`) |
| `npm run validate` | Scenario schema + ids, guide links/anchors, MDX syntax, hardcoded-set check |
| `npm test` | Unit tests (odds math, econ, normalizer, grading, SRS, hex geometry, fight simulator, Riot analysis) |
| `npm run e2e` | Playwright: smoke test per route, board screenshots at 360/768/1440, keyboard-only trainer flow (serves `out/`) |
| `npm run lint`, `npm run typecheck` | ESLint, `tsc --noEmit` |

Sync flags: `--set=<n>` (force a set number; simulates a rollover), `--source=ddragon`, `--no-assets`, `--from-file=<path>`.

## How the set layer works

`scripts/sync-set.ts` fetches `https://raw.communitydragon.org/latest/cdragon/tft/en_us.json`, validates the raw shape with Zod (`lib/sync/schema.ts`, documented in **`docs/cdragon-schema.md`** — read it, the real shape differs from what you would guess), detects the live set (highest `number`, stage mutator preferred, mode variants skipped), normalises into `lib/types.ts`, mirrors every icon into `public/assets/set-<n>/` (ETag-aware) and writes:

- `data/generated/set-<n>.json` — the normalised set
- `data/generated/current.json` — `{ setNumber, setName, mutator, syncedAt, patch }`
- `data/generated/SET_CHANGED` — only when the set number changed; lists what needs a human pass

The UI reads only `current.json` and `set-<n>.json`. Nothing outside `content/sets/`, `data/generated/` and `data/constants/set-<n>.ts` may hardcode a set number; `npm run validate` enforces it. The header badge, the `/set` hub, the trainer's set filter and the constants lookup all derive from `current.json`.

`.github/workflows/sync-set.yml` runs the sync daily at 06:00 UTC (and on dispatch) and opens a PR `chore: sync set data (<name>)`, labelled `new-set` when the set changed, with the list of content that needs a human pass in the body.

## When a new set drops (runbook)

1. Merge the `new-set` PR (or run `npm run sync-set` locally). The `/set` hub, header badge and trainer already work; a banner says the guides are being updated.
2. Create `content/sets/<n>/meta.json` with `displayName` (CDragon ships placeholder names like `Set18`).
3. Copy `data/constants/set-<previous>.ts` to `set-<n>.ts`, register it in `data/constants/index.ts`, and **verify every number** against the patch notes: shop odds, pool sizes, distinct champions per cost (count them in `set-<n>.json`), interest cap, streak brackets, XP curve, augment rounds. Update `verifiedOn` and `sources`.
4. Write `content/sets/<n>/overview.mdx` (what is different this set), `comps.json`, `tiers.json` and `wisps.json` (see Set hub extras; `npm run validate` checks every id and name).
5. Review scenarios with `setAgnostic: false` — they are hidden automatically; rewrite or delete them (`set: <n>` with real ids) and add a few new set-specific ones.
6. Re-verify `data/constants/circuit.ts` dates and `data/creators.ts` links; set `verified` / `verifiedOn`.
7. `npm run validate && npm test && npm run build && npm run e2e`.
8. Look at `e2e/screenshots/` (board at three widths) and open `/set/champions` to spot broken icons.
9. Commit and deploy.

To rehearse a rollover without a new set: `npm run sync-set -- --set=<previous>` and check that every page still builds and the badge changes; then sync again normally.

## Content authoring

**Scenarios** live in `content/scenarios/<category>/<slug>.json` and are validated at build time (`lib/scenario-schema.ts`): the build fails with the file and field named. Set-agnostic scenarios use generic ids (`generic:<role>-<cost>`, `generic:item:*`, `generic:aug:*` from `data/`); set-specific ones set `setAgnostic: false, set: <n>` and use real ids from `data/generated/set-<n>.json`. Every scenario needs `explanation`, `principle`, `guideLink` (must resolve to a real guide anchor) and ideally `commonMistake`. Board coordinates: row 0 = frontline, row 3 = backline, col 0–6.

**Guides** live in `content/guides/*.mdx`. Components: `<Callout type="leak|tip|math|note">`, `<OddsTable/>`, `<PoolTable/>`, `<InterestTable/>`, `<LevelTable/>`, `<ItemCombineMatrix/>`, `<TraitBreakpoints trait="…"/>`, `<BoardExample board={[…]}/>`, `<DrillThis category="…"/>`, `<CheckYourself items={[…]}/>`. Headings are anchors that scenarios link to; the validator tells you if you break one.

## Layout

```
app/                 routes (App Router)
components/          board/, trainer/, set/, mdx/, lab/ (TeamPlanner), tracker/ (RiotSync), layout/, ui/
content/             guides/*.mdx, sets/<n>/, scenarios/<category>/*.json
data/generated/      current.json, set-<n>.json (written by sync-set)
data/constants/      set-<n>.ts (verified numbers), circuit.ts, index.ts
data/                archetypes.ts, generic-augments.ts, creators.ts
lib/                 types, sync/, hex geometry, odds, econ, grading, srs, validate, sim/ (fight engine), riot/ (API client + analysis)
scripts/             sync-set.ts, validate.ts, serve-out.mjs
public/assets/       set-<n>/ mirrored icons, generic/ archetype icons
docs/cdragon-schema.md   the upstream shape as observed
e2e/, tests/         Playwright, Vitest
```

## Deploying (GitHub Pages, or any static host)

The site is a static export (`out/`), so it runs anywhere that serves files.

**GitHub Pages (one-time setup):** push the repo to GitHub, open *Settings → Pages* and set *Source* to **GitHub Actions**. `.github/workflows/deploy.yml` then builds and publishes on every push to `main`/`master`. A repo named `<user>.github.io` is served at the root; any other name is served at `https://<user>.github.io/<repo>/`, and the workflow sets `NEXT_PUBLIC_BASE_PATH=/<repo>` so links and icons resolve there. Add a custom domain in the same settings page if you have one (then also set `NEXT_PUBLIC_SITE_URL` in the workflow, or leave it: it is only used for canonical URLs, `robots.txt` and the sitemap).

**Netlify / Cloudflare Pages / Vercel:** build command `npm run build`, output directory `out`, no environment variables needed.

**Daily data updates:** `.github/workflows/sync-set.yml` opens a PR with the refreshed set data, patch notes, wisp costs and (if the `RIOT_API_KEY` secret exists) the live meta; merging it triggers a deploy.

**Privacy for visitors:** nothing is sent to any server of ours (there is none). The tracker keeps the visitor's Riot API key, games, planner boards and exercise answers in their own browser's localStorage; the only outbound requests from the tracker go to `api.riotgames.com` with the visitor's own key.

## Legal

TFT Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. Data via CommunityDragon and Riot Data Dragon. No Riot fonts are used.
