# TFT Lab

A static, self-updating study site for Teamfight Tactics players climbing from Emerald/Diamond to Master+ and competitive play. Three pillars:

- **Guides** — set-agnostic fundamentals (economy, leveling, rolling, items, augments, positioning, scouting, HP, stage plan, pivoting) plus a hub for the live set generated from game data.
- **Trainer** — decision drills on a real hex board with scoring, explanations and spaced repetition.
- **Path** — a weekly routine, a personal leak tracker (localStorage), and the ladder → Trials → Pro Circuit pathway.

It is **not** a meta/stats site. It does not scrape MetaTFT, tactics.tools, Mobalytics, op.gg or anyone else; it links to them.

## Stack

Next.js 15 (App Router, `output: 'export'`), TypeScript strict, Tailwind v4 with CSS tokens, MDX via `@mdx-js/mdx`, Zustand + localStorage, `@dnd-kit` for the board, Vitest, Playwright. No backend, no database, no auth.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `validate` then static export to `out/` |
| `npm run sync-set` | Fetch the live set from CommunityDragon (fallback Data Dragon), mirror icons, write `data/generated/` |
| `npm run validate` | Scenario schema + ids, guide links/anchors, MDX syntax, hardcoded-set check |
| `npm test` | Unit tests (odds math, econ, normalizer, grading, SRS, hex geometry) |
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
4. Write `content/sets/<n>/overview.mdx` (what is different this set).
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
components/          board/, trainer/, set/, mdx/, lab/, tracker/, layout/, ui/
content/             guides/*.mdx, sets/<n>/, scenarios/<category>/*.json
data/generated/      current.json, set-<n>.json (written by sync-set)
data/constants/      set-<n>.ts (verified numbers), circuit.ts, index.ts
data/                archetypes.ts, generic-augments.ts, creators.ts
lib/                 types, sync/, hex geometry, odds, econ, grading, srs, validate
scripts/             sync-set.ts, validate.ts, serve-out.mjs
public/assets/       set-<n>/ mirrored icons, generic/ archetype icons
docs/cdragon-schema.md   the upstream shape as observed
e2e/, tests/         Playwright, Vitest
```

## Legal

TFT Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. Data via CommunityDragon and Riot Data Dragon. No Riot fonts are used.
