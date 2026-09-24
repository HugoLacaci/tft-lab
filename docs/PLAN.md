# Oracle: plan

Oracle is the analysis agent inside TFT Lab: automatic game breakdowns, pause-and-ask on a VOD, and exercise generation from real mistakes. This file is the working plan: milestones with estimates, the questions that need an answer from the owner, and the risks most likely to sink the project. It is updated at every milestone; the reasoning behind each decision stays here so it can be revisited.

Ground rule for everything below: **Oracle never asserts game state it did not read from a tool result.** Every factual claim carries a `{ stage, field }` evidence reference and the UI renders it as a chip that shows the raw value and its confidence. The structured timeline and the eval set are the product; the model is a commodity.

## Where we are

- 2026-09-24: M1 built (this commit). Ontology as JSON Schema with generated TypeScript types, `deriveDecisions` with the accounting equation and tests, three fixture timelines, `/analysis/<matchId>` rendering them with the existing `Board`. No perception code.

## Milestones

Estimates are working days for one engineer with this codebase, assuming the open questions below get answered in the first week. They are honest guesses, not commitments; each milestone ends with something that runs end to end and is committed.

| # | Milestone | Done when | Estimate |
|---|---|---|---|
| M1 | Ontology + fixtures | `Board` renders a fixture `GameTimeline` at `/analysis/<matchId>`; `deriveDecisions` balances gold on every fixture round; TS types generated from the schema | 3 d · **done** |
| M2 | Riot API path | Paste a Riot ID, see the last 20 games' final boards as `GameTimeline`s with `provenance: "riot-api"`; token-bucket limiter; Ecosystem Analytics enabled | 4 d (blocked on the API key, see Q1) |
| M3 | Perception on uploaded video | One of our own uploaded games yields a timeline whose final board matches the Riot final board (unit F1 ≥ 0.95); anchors + homography, ROI map, PaddleOCR, template matching from the mirrored set icons, keyframes, reconciler | 15–20 d |
| M4 | Eval harness | 300 labelled keyframes + metrics in CI; a deliberate ROI-map regression fails the build | 8 d + labelling time |
| M5 | Reasoning | Full breakdown for an M3 timeline with zero grounding violations; κ ≥ 0.5 on the decision gold | 10 d + 60 labelled rounds (Q4) |
| M6 | Breakdown UI | Ribbon, round detail, decisive moments, evidence chips; a reader who did not build it says where the game was lost | 5 d (ribbon + chips already exist from M1) |
| M7 | Screen-capture ingestion | `getDisplayMedia` with a consent UI produces a timeline from a VOD without downloading anything | 8 d |
| M8 | Pause & ask | Answers the 40 gold questions acceptably | 5 d |
| M9 | Exercise generator + review queue + tutor | 20 generated scenarios pass human review at ≥ 80% unchanged | 8 d |
| M10 | Leak fingerprint + progress view | Recurring leaks across N games with links to the exact rounds; frequency over time | 5 d |

Order is fixed by dependencies: M4 before M5 (reasoning quality is unmeasurable without the harness), M3 before M7 (screen capture is a worse video source than an upload; make the pipeline work on the good source first).

### What M1 deliberately did and did not do

- **Ontology lives at `packages/ontology/`** with the JSON Schema as the single source and generated TypeScript in `packages/ontology/ts/`. The Pydantic side (`datamodel-code-generator`) is wired as an npm script and documented, but **not run yet**: there is no Python toolchain on the build machine (see Q5) and no Python service until M2/M3. The schema is what prevents drift; the Python models are generated from it when the API exists.
- **No monorepo move yet.** The spec's `apps/web` + `apps/api` layout is right once there are two apps. Moving the Next.js app today breaks the deploy workflow, the search index and the sync scripts for zero functional gain. The move happens with M2, when `apps/api` is created, as its own commit.
- **`RoundState.board` is the trainer's `PlacedUnit`**, byte for byte, and a compile-time test asserts the generated type is assignable both ways. `Board` renders timelines with no adapter.
- **Two states per round in fixtures** (`planning` start and end) so a decision is what the player did, isolated from income. When only one state per round exists (Riot API, sparse perception), `deriveDecisions` estimates the income between rounds from the set constants and says so (`incomeEstimated: true`).

## Open questions (need the owner)

1. **Riot API key.** Is there a registered TFT product on the Riot developer portal, and at what tier? A development key expires every 24 hours and is useless for M2 beyond a demo; a production key needs a product description and is granted selectively. This gates M2 and the endpoint-agreement metric of M3. *Decision needed: register now, under which product name and description.*
2. **Budget ceiling per breakdown.** Pass 1 verdicts are a batch of cheap structured calls, pass 2 is one extended-thinking call, plus vision escalations. A full game at list price is plausibly $0.20–0.60 depending on escalation rate. *What is the ceiling per game, and is a slower Batch-API path (50% cost, minutes of latency) acceptable for non-interactive breakdowns?*
3. **Target resolutions and sources.** Which streams and recordings must work at launch: 1080p borderless only, or also 1440p, ultrawide, and streams with webcam overlays covering part of the UI? The homography approach handles scaling; occlusion of an anchor is a different problem. *Give three concrete reference streams to build the perception gold set from.*
4. **Decision gold labellers.** The verdict metric needs two Master+ players to label 60 rounds independently. *Who, at what rate, and by when?* Without this M5 cannot be measured and should not start.
5. **Python toolchain.** The API and workers are Python 3.12; the current machine has no Python. *Local dev in Docker only, or install a toolchain?* Affects the ontology codegen check and M2 onward.
6. **Language.** Bilingual ES/EN from day one means i18n in the web app, which does not exist today. *Is Spanish UI a launch requirement for Oracle, or is English UI with Spanish agent output acceptable for v1?*
7. **Data retention.** How long may uploaded recordings and extracted frames live? The policy draft says "processing window only" for third-party video and asks for a number for user uploads. *Propose 7 days for raw uploads, indefinite for derived timelines, with a delete-my-data control.*

## Three risks most likely to sink this

1. **Perception is worse than it looks in the demo.** Every existing TFT vision tool hardcodes 1920×1080 ROIs and dies on the first different overlay. If field accuracy on real streams lands at 0.85 instead of 0.97, every downstream verdict is built on sand and the grounding gate will reject most breakdowns. *Mitigation:* anchor detection + homography from day one, never hardcoded pixel ROIs; the reconciler marks contradictions `unknown` rather than guessing; the perception gold set (M4) is built from **other people's** streams, not our recordings; escalation rate is a headline metric with an alert at 15%. If accuracy stalls, the product degrades to Riot-API timelines (final boards) plus screen-capture "pause & ask" on the fields we can read, which is still useful.
2. **The accounting equation does not close on real data.** Gold moves through buys, sells, XP, rolls, interest, streaks, PvE drops, augments and Wisps; if roll inference is wrong, "you rolled 14 times at 3-2" is a hallucination with a number on it. *Mitigation:* `deriveDecisions` is explicit accounting with a residual; any non-zero residual sets `lowConfidence` and the verdict layer is forbidden from citing rolls on a low-confidence decision. The Set-18 income events (Wisps, augment gold) are enumerated in the schema as `incomeEvents` so the equation has a place to put them instead of absorbing them into "rolls". Fixtures include one deliberately unbalanced round to prove the degradation path.
3. **Verdict quality is unmeasurable and quietly wrong.** Coaches disagree; a model that sounds confident on contested rounds teaches wrong habits, and nobody notices because the prose reads well. *Mitigation:* the decision gold is labelled by two players; only rounds where they agree are scored, and the disagreements become a calibration set where confident verdicts lose points. Groundedness and hallucination are hard CI gates, verdict κ is a reported delta. Pass 2 is required to name what the player did well and one leak, so a breakdown is never a list of nitpicks.

## Known issues

- In `next dev` the `Board` logs a React hydration-attribute warning when server-rendered (also on the guide pages that embed a board; pre-existing, dnd-kit/Radix ids). Production builds are clean: the smoke suite asserts zero console errors on `/analysis/*`. Track down before M6 so the dev console is trustworthy.
- `itemsCombined` pairs vanished components by recipe when the set data knows the recipe and by elimination otherwise (with a note); duplicate champions on one board make `repositioned` ambiguous (first match wins).

## Non-risks worth naming

- Set rollover: the ontology carries `setNumber` and `patch`; template libraries regenerate from the existing set sync; knowledge retrieval hard-filters on set.
- Legal: no video download, no mirroring, no live assistance; see `docs/POLICY.md`.
