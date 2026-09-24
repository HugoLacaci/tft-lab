# TFT Lab

A static, self-updating study site for Teamfight Tactics players climbing from Emerald/Diamond to Master+ and competitive play. Three pillars:

- **Guides** — set-agnostic fundamentals (economy, leveling, rolling, items, augments, positioning, scouting, HP, stage plan, pivoting) plus a hub for the live set generated from game data.
- **Trainer** — decision drills on a real hex board with scoring, explanations and spaced repetition, plus a ladder of **tactics puzzles** (chess puzzles, but TFT) graded by rank from Iron–Silver to Master+.
- **Path** — a weekly routine, a personal game tracker (localStorage, optionally fed by your own Riot match history), and the ladder → Trials → Pro Circuit pathway.
- **Lab** — odds and econ calculators, a printable cheat sheet, and a team planner: every champion, item and augment of the live set on the real board, an enemy board opposite, and a Monte-Carlo fight simulator.

It is **not** a meta/stats site. Its statistics come from the official Riot API (top-ladder matches for the item/comp numbers, your own games for the tracker), and it links to MetaTFT, tactics.tools and the rest instead of scraping them. The one exception is Wisp gold costs, which Riot does not publish anywhere: they are read from lolchess's public table (`npm run sync-wisps`).

## Team planner & fight simulator (`/lab/board`)

Planner and Versus modes. Drag champions and items from the pickers onto the board (or click to auto-place: ranged units go to the back row, melee to the front), drag between hexes, ✕ on a unit removes it, click a unit to set its star level and up to three items, pick up to three augments per side (tagged Combat/Gold/Item/Shop/Trait like the augments page). An in-game style trait column sits left of each half, coloured by the tier reached; it counts emblems and Crest/Crown augments. Pickers show the same hover cards as the set hub (hold ~1 s). **Simulate fight** runs `lib/sim` N times and reports win rate, survivors, fight length and damage dealt/taken/healed per unit.

The simulator is an estimate, not the client: base stats, attack speed, crit, range, mana and item effects come from the synced data (`stats.attackSpeed`, `ability.scaling`, `items[].effects`, `items[].associatedTraits` were added to the normaliser for this); Riot ships no ability numbers, so abilities are modelled by cost and star and by the stat their text scales with, traits by breakpoint tier and augments by tier and wording. Named items with real behaviour are listed in the page's "How the fight is estimated" panel. State persists in `localStorage` (`tftlab.planner.v1`) and **Copy link** puts it in the URL hash.

## Tactics puzzles (`/trainer/puzzles`)

Scenarios with `kind: "puzzle"` are one-board, one-best-move problems: place a unit, swap two units, or make the call. They sit in the normal category folders (so category drills, the Daily 10 and the SRS include them) and the ladder groups them by rank tier. `difficulty` is the tier: 1 Iron–Silver, 2 Gold–Platinum, 3 Emerald–Diamond, 4 Master+ (`lib/rank-tiers.ts`; every drill carries one too). Each tier page runs a session in ladder order and a `#<id>` hash starts at a given puzzle; the hub renders a static thumbnail of every board (`components/trainer/MiniBoard.tsx`) and the solved/retry state from the browser's progress.

The `swap` question type (`correctPairs`, graded in either order, half credit for one right unit) was added for the "one move fixes it" puzzles; `title` is an optional card title. Puzzles mix generic archetypes (set-agnostic) with real champions of the live set (`setAgnostic: false`), and the set-specific ones are written from the champions' ability text (range, leap/bounce/line rules) so they stay true to the mechanics; when the set changes they are hidden like any other set-specific scenario.

## What changed since you last looked

Two "NEW" markers, kept per browser in localStorage (`tftlab.seen.v1`, `lib/whats-new.ts`): a teal dot on the header set badge and NEW pills on the set hub cards and the set sub-navigation. They compare a build-time stamp (`lib/whats-new-server.ts`) with what the browser saw last.

- **Patch notes**: the stamp is the newest note's slug, so the daily sync flips it whenever Riot publishes. Opening `/set/patch-notes` marks it seen; notes published after the one you saw last carry a dot for that visit. A first-time visitor sees the marker only if the newest note is under two weeks old.
- **Comps**: `npm run sync-comps` (`scripts/sync-comps.ts`, run before `next build` and in the daily workflow) diffs `content/sets/<n>/comps.json` against the previous patch and writes `data/generated/comps-changes.json`. It keeps two snapshots in `data/generated/comps-history.json`: `baseline` (the comps on the previous patch label) and `latest`; when the `patch` field in comps.json changes, `latest` becomes the new baseline, so the diff always reads "since the last patch". `/set/comps` shows a summary bar (new / up / down / adjusted / dropped, with a "changes only" filter) and a badge on each changed card: ★ new, ↑ / ↓ tier move with the tiers, ✎ adjusted, plus the detail list (board units added or removed, repositioned units, item changes per carry, augments, style, guide text) inside the card. A comp that changed tier sits in its new tier (cards are ordered by the current `tier`) with a coloured edge and a slide-in, and its old tier keeps a dashed ghost row ("Moved up · now in A tier · Jump to it") that scrolls to the card. After editing comps.json, run `npm run sync-comps` and commit `data/generated/comps-*.json` (the daily workflow does it too).

## Visual layer

Dark hextech look: `components/layout/Backdrop.tsx` is a fixed decorative layer (drifting hex grid, three slow colour glows, rising wisps), panels carry corner ticks and a hover lift, and `app/globals.css` holds the motion helpers (`.rise`, `.float`, `.pop`, `.flash-ok/.flash-bad`). The backdrop also carries a **scene per section** (`components/layout/Scenes.tsx`, picked from the pathname and cross-faded on navigation): the home page has Little Legends walking an orbit and hopping while gold rises; `/set` scrolls two endless shop columns of real champion cards in the side gutters; `/trainer` fights two tilted boards in the gutters (units charge, arrows and casts fly, HP and mana bars move); `/lab` turns hextech gears with rising bubbles and a scan line; every other section spins two trait mandalas built from the set's trait icons with drifting gold motes. Gutter scenes appear from 1280px wide so they never sit under the text column. Everything respects `prefers-reduced-motion`. Little Legends (Pengu, Choncc and friends) decorate the hero, the trainer, the puzzle ladder and the session feedback through `components/ui/Legend.tsx`; their art is mirrored from CommunityDragon's companion tooltips into `public/assets/legends/*.webp` (320px, square-cropped). Rank emblems and category glyphs are inline SVG (`components/ui/RankEmblem.tsx`, `components/ui/Glyphs.tsx`).

## Set hub extras

- **Champion pages** (`/set/champions/<id>`): ability text and a base-stats table at 1, 2 and 3 stars (health ×1.8 and attack damage ×1.5 per star, the constants `lib/sim/stats.ts` uses; auto-attack DPS = AD × attack speed).
- **Hover cards** (`components/set/hovers.tsx`): champions and items show an in-game style tooltip after ~1 s; ability and item text keep the stat icons (`renderDescRich`).
- **Item catalogue order** (`/set/items`, `components/set/ItemList.tsx`): an "All" kind first, then Components / Completed / Emblems / …; sorted by type by default (Tank, Mage, Physical damage, Bruiser, Hybrid, Utility, with group headers), or by tier, name A→Z or Z→A. The type comes from `lib/item-roles.ts` (a completed item from its two components, a component from its name, anything without a recipe from its stat effects). Emblems sort origins first (Spatula recipes, then uncraftable ones), then classes (Frying Pan recipes, then uncraftable). Riot ships no origin/class flag, so `lib/trait-kinds.ts` infers it: Spatula emblems mark origins, Frying Pan emblems classes, and the champions' trait combinations settle the rest.
- **Stat icons** (`components/set/StatIcon.tsx`; names, colours, word rules and the icon file map in `lib/stat-meta.ts`): the game's own stat icons. The client resolves `%i:scaleAD%`-style tokens to the "text icons" under CommunityDragon's `assets/ux/fonts/texticons/` (`lol/statsicon/scalead.png`, `scaleap`, `scalehealth`, `scalearmor`, `scalemr`, `scaleas`, `scalemana`, `scalecrit`, `scalecritmult`, `scaleda`, `scaledr`, `scalesv`, `scalels`, `scalerange`, `scalelevel`, `lol/gameplay/goldcoins.png`, `tft/tft_manaregenicon.png`…); `npm run sync-stat-icons` mirrors them into `public/assets/stats/` (ETag-aware, also in the daily workflow) and the PNGs are committed. `RichText` turns `[[AD]]` markers into icons and, with `words`, puts an icon before plain stat names too ("Attack Damage", "Armor", upper-case "HP"), which is how augment and trait text, which ships without icon tokens, gets them. Used in the hover cards (stats, cost in gold), the champion page (stat table, ability, traits), the items / augments / wisps / traits pages, the planner (unit editor, item picker) and the trainer's board status (gold and player HP). In MDX: `<Stat k="AD" />` (icon + label, `label="…"` to override, `icon` for the icon alone) and `<StatWords text="…" />`.
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
| `npm run sync-comps` | Diff the curated comps against the previous patch into `data/generated/comps-changes.json` (runs in `build`) |
| `npm run sync-meta` | Item / unit / comp statistics from top-ladder Riot matches into `data/generated/meta.json` (needs `RIOT_API_KEY`) |
| `npm run validate` | Scenario schema + ids, guide links/anchors, MDX syntax, hardcoded-set check. Curated comps/tiers naming an id the live patch removed are **warnings** (printed, exit 0); `npm run validate:strict` makes them fatal (use it when authoring content) |
| `npm run build-search` | Write `public/search-index.json` for the site-wide search (runs in `build` and `dev`; gitignored) |
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

`.github/workflows/sync-set.yml` runs every six hours (and on dispatch): set data, patch notes, wisp costs, stat icons, comps diff, optional Riot meta. Outcomes:

- **Same set, validation clean or warnings only** → commits the data to the default branch and dispatches the deploy. The site is on the new patch within minutes of the run.
- **Curated content stale** (a comp names an augment Riot renamed, a tier names a wisp that left the pool) → the data still ships; the run opens or bumps an issue labelled `curated-stale` listing what to fix in `content/sets/<n>/`. The comps page shows a "patch X is live, curated on Y" note until the file's `patch` field catches up (`lib/live-patch.ts`).
- **Hard validation error or failing tests** → nothing is committed; a PR `chore: sync needs review` carries the data, and the run fails.
- **New set** → PR `chore: sync set data (<name>)` labelled `new-set`, with the list of content that needs a human pass.
- **Any failure** (network, upstream schema change) → an issue labelled `sync-failed` is opened or commented, so a broken sync is noticed without watching the Actions tab.

Why warnings: on 2026-09-23 patch 18.3 renamed `DA_CursedCrown` to `TFT7_Augment_CursedCrown` and removed the Crystal Ball wisp; the validator treated both as fatal, the run failed and the site stayed on 18.2 for a day. Stale curated references now degrade (unknown augments are skipped on the comps page) instead of blocking the data.

The patch label shown everywhere ("18.3") comes from the newest patch note, not from CDragon's `patch` field, which is the client build ("16.19").

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

**Scenarios** live in `content/scenarios/<category>/<slug>.json` and are validated at build time (`lib/scenario-schema.ts`): the build fails with the file and field named. Set-agnostic scenarios use generic ids (`generic:<role>-<cost>`, `generic:item:*`, `generic:aug:*` from `data/`); set-specific ones set `setAgnostic: false, set: <n>` and use real ids from `data/generated/set-<n>.json`. Every scenario needs `explanation`, `principle`, `guideLink` (must resolve to a real guide anchor) and ideally `commonMistake`. `difficulty` is the rank tier (1–4, see Tactics puzzles); `kind: "puzzle"` puts a scenario on the puzzle ladder; question types are `choice`, `placement`, `augment`, `item-holder`, `ordering` and `swap`. Board coordinates: row 0 = frontline, row 3 = backline, col 0–6.

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

## Navigation, search and responsive layout

- **Header** (`components/layout/Header.tsx`, `SiteNav.tsx`, `nav.ts`): one row at every width. Comps is the accented first item; Routine / Compete / Resources live only in the menu sheet (`secondary`). The set badge shows set, name and live patch. `activeNavHref` lights the longest matching item, so `/set/comps` lights Comps rather than Set.
- **Search** (`components/layout/SearchPalette.tsx`, `lib/search.ts`): Ctrl/⌘ K, `/`, the header button or the bottom bar. Static index from `scripts/build-search-index.ts` (champions, traits, items, augments, wisps, comps, guides, pages), fetched once on first open. Every query token must match; name prefix beats name substring beats extra words (traits on a champion, units in a comp).
- **Phones**: bottom bar (`BottomNav.tsx`: Comps, Set, Trainer, Lab, Search) hidden from `lg` up and on short landscape screens; menu sheet with big tap targets; the set sub-nav scrolls sideways (`.chip-scroll`) and sticks under the header.
- **Landscape and safe areas**: `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on header, main, footer and bottom bar. `@media (orientation: landscape) and (max-height: 520px)` shortens the header, drops the bottom bar and hero padding, and disables the backdrop scenes. The page column is `--content-w` (72rem, 80rem from 1700px); the gutter scenes derive from it. `main` clips horizontal overflow so decorative absolutes never cause a horizontal scrollbar.
- **Home** (`app/page.tsx`, `components/home/CompsSpotlight.tsx`): the hero's primary action is the comps tier list, next to a card with the top comps and their boards (each row deep-links to `/set/comps/#comp-<id>`, which `CompList` opens on load). Then live-set tiles with counts, the four pillars, and how the site stays current.
- **Comps page**: stale-patch note, sticky toolbar with tier jump chips, tier bands, trait chips on phones (first three), deep links in the URL hash.
- **Brand**: `app/icon.png`, `app/apple-icon.png`, `app/opengraph-image.png` and `public/icons/*` were generated from the header hex mark (sharp, see git history); `app/manifest.ts` makes the site installable.

## Deploying (GitHub Pages, or any static host)

The site is a static export (`out/`), so it runs anywhere that serves files.

**GitHub Pages (one-time setup):** push the repo to GitHub, open *Settings → Pages* and set *Source* to **GitHub Actions**. `.github/workflows/deploy.yml` then builds and publishes on every push to `main`/`master`. A repo named `<user>.github.io` is served at the root; any other name is served at `https://<user>.github.io/<repo>/`, and the workflow sets `NEXT_PUBLIC_BASE_PATH=/<repo>` so links and icons resolve there. Add a custom domain in the same settings page if you have one (then also set `NEXT_PUBLIC_SITE_URL` in the workflow, or leave it: it is only used for canonical URLs, `robots.txt` and the sitemap).

**Netlify / Cloudflare Pages / Vercel:** build command `npm run build`, output directory `out`, no environment variables needed.

**Daily data updates:** `.github/workflows/sync-set.yml` refreshes the set data, patch notes, wisp costs and (if the `RIOT_API_KEY` secret exists) the live meta every day at 06:00 UTC. When validation and tests pass it commits straight to the default branch and dispatches the deploy, so the site updates itself with no review. The one exception is a new set: then it opens a PR labelled `new-set`, because the written content needs a human pass (see the runbook).

**Privacy for visitors:** nothing is sent to any server of ours (there is none). The tracker keeps the visitor's Riot API key, games, planner boards and exercise answers in their own browser's localStorage; the only outbound requests from the tracker go to `api.riotgames.com` with the visitor's own key.

## Legal

TFT Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. Data and Little Legend art via CommunityDragon and Riot Data Dragon. No Riot fonts are used.
