# @tftlab/ontology

The game-state ontology Oracle runs on: `RoundState`, `GameTimeline`, `Decision`. One JSON Schema is the source; every language binding is generated from it so the TypeScript and Python views of a round can never drift.

```
schema/game-state.schema.json   the source of truth (draft-07)
ts/types.ts                     GENERATED TypeScript (npm run ontology)
ts/index.ts                     hand-written: validator (Ajv) and re-exports
ts/decisions.ts                 hand-written: deriveDecisions (pure, tested)
py/                             GENERATED Pydantic models (npm run ontology:py)
fixtures/*.json                 hand-built GameTimelines for tests and the /analysis route
```

## Regenerate

```
npm run ontology        # TypeScript, via json-schema-to-typescript
npm run ontology:py     # Pydantic v2, via datamodel-code-generator (pip install datamodel-code-generator)
```

CI runs `npm run ontology` and fails if `ts/types.ts` changed, so a schema edit without regenerated types cannot merge.

## Design notes

- `PlacedUnit` and `BenchUnit` are copies of the trainer's shapes (`lib/scenario-schema.ts`); `tests/ontology.test.ts` asserts assignability both ways at compile time, so the existing `Board` renders a `RoundState` with no adapter.
- Fixtures carry two states per planning phase (`phaseMoment: "start" | "end"`) so a decision is what the player did, isolated from income. Sparse sources (Riot API, gappy perception) get one state per round and `deriveDecisions` estimates income from `data/constants` and marks it `incomeEstimated`.
- The accounting equation is explicit: `goldStart + income + sold − bought − xp·4 − rolls·2 − goldEnd = residual`. Rolls are the unknown solved for; a residual that is not a whole number of rolls sets `lowConfidence` and the residual is kept, never absorbed.
- `incomeEvents` on a state (PvE drop, augment gold, Wisp, carousel) are how observed extra gold enters the equation instead of being mistaken for rolls.
