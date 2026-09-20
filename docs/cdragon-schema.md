# CommunityDragon TFT schema (as actually observed)

Source: `https://raw.communitydragon.org/latest/cdragon/tft/en_us.json`
Observed: **2026-09-20**, game patch **16.18** (`content-metadata.json` → `16.18.8175716+branch.releases-16-18…`), file size 24.2 MB, 35 `setData` entries.

This document records what the file really looks like, because the spec's description drifted. `lib/sync/schema.ts` is generated from this; if a sync fails validation, re-fetch, diff against this file, update both.

## Top level

```
{ items: Item[], setData: SetEntry[], sets: { [setNumber: string]: { name, champions, traits } } }
```

`sets` is a subset of `setData` keyed by number (no `mutator`, `number`, `items`, `augments`). We use `setData` only.

## SetEntry

```
{ number: int, mutator: string, name: string,
  champions: Champion[], traits: Trait[], items: string[] /* apiNames */, augments: string[] /* apiNames */ }
```

- Several entries share a `number`. For 18 today there is exactly one (`TFTSet18`), but 13–17 have `_PVEMODE`, `_TURBO`, `_PAIRS`, `_Evolved`, `_CarouselOfChaos`, `Event…` variants. Mid-set updates add `<mutator>_Stage2` (Set 7 has `TFTSet7_Stage2`). One outlier: `TFTSet7_Stage2_CT` carries `number: 15`.
- **`name` is a placeholder.** Set 18's entry says `"Set10"`. Set 13–17 say `"Set13"`…`"Set17"`. Only Set 3 has a real name (`Galaxies`). We therefore treat `/^Set\d+$/` as "no name" and take the display name from `content/sets/<n>/meta.json`.
- Set 18 apiNames use a **`DA_` prefix**, not `TFT18_` (e.g. `DA_18_Ivern`, `DA_Sentinel18`, `DA_Lux18_Base`). Do not match on `TFT18_`.

Detection rule (`lib/sync/detect.ts`): max `number` → drop mutators matching `/(PVE|TURBO|PAIRS|EVENT|TUTORIAL|CAROUSEL|MACAO|_CT)/i` → prefer `/stage\d/i` (highest stage) → else shortest mutator.

## Champion

```
{ apiName, characterName, name, cost: int, role: null,
  icon: "None", tileIcon: "assets/characters/tft18_sentinel/tft18_sentinel_square.tex",
  squareIcon: "assets/characters/tft18_sentinel/skins/base/images/t_18_sentinel_teamplannersplash.tex",
  traits: string[]  /* trait NAMES ("Vanguard"), not apiNames */,
  stats: { armor, attackSpeed, critChance, critMultiplier, damage, hp, initialMana, magicResist, mana, range },
  ability: { name, desc, icon: "None", variables: [] } }
```

- `name` is `null` on a handful of units in older entries (setData[0].champions[82], [85]; setData[12].champions[13]). Nullable in the schema; such units are non-playable.
- `icon` is literally `"None"` for every Set 18 champion; `tileIcon` is the square. Use `tileIcon` → `squareIcon` → `icon`.
- Cost values present: 1, 2, 3, 4, 5, **8** (armory keys), **11** (mercenary chest). PvE monsters (`TFT_Krug`, `TFT_TrainingDummy`, …) are cost 1 with `traits: []`. **Playable = cost 1–5 and ≥1 trait.**
- Set 18 counts after the filter: 1-cost 14, 2-cost 13, 3-cost 14, 4-cost 14, 5-cost 19 (includes 9 Lux forms sharing "Avatar"). The 5-cost count is not the pool size.
- `ability.variables` is **empty** for Set 18, so `@ShieldCalc1@` tokens cannot be resolved. `renderDesc` leaves them as `{ShieldCalc1}`.
- `ability.desc` contains `\r\\n` literal sequences, `<keyword>`, `<rules>` and `%i:scaleAP%` tokens.

## Trait

```
{ apiName: "DA_18_Elderwood", name: "Elderwood", desc, icon: "assets/ux/traiticons/trait_icon_18_elderwood.tex",
  effects: [{ minUnits: int|null, maxUnits: int, style: int, variables: { "{hash}": number } }] }
```

`desc` uses `<row>(@MinUnits@) …</row>` once per breakpoint, in effect order.

**`style` mapping** (evidence: Elderwood 3/5/7/9/11 → 1/3/5/5/6; ten single-breakpoint traits at 1 unit → 4):

| style | meaning |
|---|---|
| 1 | bronze |
| 2 | (unobserved; mapped to silver) |
| 3 | silver |
| 4 | unique (single-unit traits: Avatar, Bounty Seeker, Old Growth…) |
| 5 | gold |
| 6 | prismatic |

- `Eclipse` has one effect with `minUnits: null` → skipped.
- Trait icon PNGs for Set 18 can be tiny (296 bytes for Elderwood): placeholder art on this patch.

## Item (also augments)

```
{ apiName, name: string|null, desc, icon, isAugment: bool, composition: string[], associatedTraits: string[],
  incompatibleTraits: string[], tags: string[], effects: { [key]: number|null }, from: null, id: null, unique: bool }
```

- The set's `items[]` (771 for Set 18) contains **no** augments; `augments[]` (592) lists them separately. Both are apiName lists resolved against the global `items` array.
- 4 items have an empty name → dropped.
- **Duplicates across id families.** `TFT_Item_BFSword` and `DA_Component_BFSword` both appear; `TFT_Item_InfinityEdge` (built from `TFT_Item_*`) and `DA_InfinityEdge` (built from `DA_Component_*`) both appear. The set's completed items reference `DA_Component_*`, so that family is canonical. See `dedupeItems` in `lib/sync/normalize-cdragon.ts`.
- `DA_18_<Name>` / `DA_18_<Name>_Upgrade` pairs (345 items tagged `{5b609ae2}`, icon `set18_mechanicicon.tex`) are the set mechanic, not shop items. Kept as `kind: "other"`.

### Item tags (hashed) observed

| tag | meaning | evidence |
|---|---|---|
| `component` | component | the 10 base components (both families) |
| `{ebcd1bac}` | emblem | 17 of the `DA_18_Emblem*` items |
| `{6ef5c598}` | radiant | 72 items, all `*Radiant` |
| `{44ace175}` | artifact | 79 items: `DA_Artifact_*`, `TFT4_Item_Ornn*`, `TFT9_Item_Ornn*` |
| `{27557a09}` | support | 16 items: Knight's Vow, Zeke's Herald, Locket, Chalice, Randuin's, Zephyr… |
| `{7ea41d13}` | completed (craftable) | 72 items with a 2-component composition |
| `{ec243f6b}` | "equippable, not craftable" (radiant/artifact/support) | 158 |
| `{d8d00bcc}` | unique-per-board | 31 (support + emblem subset) |
| `{5b609ae2}` | set-18 mechanic entries | 345 |
| `Consumable`, `TFT_Consumable_ItemRemover`, … | consumables | 58 |

Classification order: component → emblem → radiant → artifact → support → composition≥2 ⇒ completed → other.

## Augment tier

No field. Every one of the 592 augments carries exactly one of three tags. Cross-tabulated against the `-i`/`-ii`/`-iii` icon suffix (336 augments have one; 256 use a generic icon such as `missing-t2.tex`):

| tag | `-i` | `-ii` | `-iii` | none | ⇒ |
|---|---|---|---|---|---|
| `{d11fd6d5}` | 127 | 2 | 1 | 30 | **silver** |
| `{ce1fd21c}` | 0 | 221 | 3 | 52 | **gold** |
| `{cf1fd3af}` | 0 | 8 | 117 | 31 | **prismatic** |

The few off-diagonal cases are augments whose icon was reused from a different tier of the same augment. The tag is authoritative; the icon suffix is the fallback.

`associatedTraits` holds trait apiNames (`DA_18_Blossom`). Many Set 18 augment names are duplicated across ids (e.g. two `Branching Out`); we keep every id.

## Asset URLs

Every `icon`/`tileIcon`/`squareIcon` is a game path ending in `.tex` (older builds: `.dds`). Rule, implemented once in `lib/cdragon.ts`:

1. lowercase the whole path;
2. strip a leading `/lol-game-data/assets/` if present;
3. replace the trailing `.tex`/`.dds` with `.png`;
4. prefix `https://raw.communitydragon.org/latest/game/`.

Verified 200 on 2026-09-20:

- `…/game/assets/characters/tft18_sentinel/tft18_sentinel_square.png` (17 758 B)
- `…/game/assets/characters/tft18_sentinel/skins/base/images/t_18_sentinel_teamplannersplash.png`
- `…/game/assets/ux/traiticons/trait_icon_18_elderwood.png`
- `…/game/assets/maps/tft/icons/items/hexcore/tft_item_bfsword.png`
- `…/game/assets/maps/tft/icons/augments/hexcore/branching-out-i.png`
- `…/game/assets/maps/tft/icons/augments/hexcore/missing-t2.png`

CDragon sends strong ETags (`"6a824dc6-6028"`); `lib/sync/mirror.ts` uses them to skip unchanged files.

## Data Dragon (fallback)

`https://ddragon.leagueoflegends.com/api/versions.json` → `["16.18.1", …]`.

| file | entries | shape |
|---|---|---|
| `tft-champion.json` | 334 | `data["Maps/Shipping/Map22/Sets/TFTSet18/Shop/DA_18_Xayah"] = { id, name, tier, cost?, image: { full, … } }` |
| `tft-trait.json` | 355 | `data["DA_18_Adaptor"] = { id, name, image }` |
| `tft-item.json` | 1187 | `data["TFTSet18/Set18_Items/DA_18_EmblemBlackthorn"] = { id, name, image }` |
| `tft-augments.json` | 758 | `data["DA_18_BigGrabBag"] = { id, name, description, image }` |

No traits per champion, no stats, no breakpoints, no compositions. Set number is parsed from the `TFTSet<n>` segment of the champion keys. Images: `https://ddragon.leagueoflegends.com/cdn/<ver>/img/tft-champion/<image.full>`.
