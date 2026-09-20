/**
 * Zod schemas for the RAW upstream shapes, generated from what we actually
 * fetched on 2026-09-20 (see docs/cdragon-schema.md). They are deliberately
 * loose (`.loose()`) on unknown keys and strict on the keys we depend on, so
 * schema drift on a field we use fails loudly while extra fields are ignored.
 */
import { z } from "zod";

// ---------------------------------------------------------------- CDragon --

export const RawCdChampion = z
  .object({
    apiName: z.string().min(1),
    name: z.string().nullable(), // null on a few PvE/utility units in older set entries
    cost: z.number().int(),
    traits: z.array(z.string()),
    icon: z.string().optional(),
    tileIcon: z.string().optional().nullable(),
    squareIcon: z.string().optional().nullable(),
    stats: z
      .object({
        hp: z.number().nullable().optional(),
        damage: z.number().nullable().optional(),
        armor: z.number().nullable().optional(),
        magicResist: z.number().nullable().optional(),
        range: z.number().nullable().optional(),
        mana: z.number().nullable().optional(),
        initialMana: z.number().nullable().optional(),
      })
      .loose(),
    ability: z
      .object({
        name: z.string().nullable().optional(),
        desc: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        variables: z
          .array(z.object({ name: z.string(), value: z.array(z.number().nullable()).nullable().optional() }).loose())
          .optional(),
      })
      .loose(),
  })
  .loose();

export const RawCdTraitEffect = z
  .object({
    minUnits: z.number().int().nullable(),
    maxUnits: z.number().int().nullable(),
    style: z.number().int(),
    variables: z.record(z.string(), z.number().nullable()).optional(),
  })
  .loose();

export const RawCdTrait = z
  .object({
    apiName: z.string().min(1),
    name: z.string(),
    desc: z.string(),
    icon: z.string(),
    effects: z.array(RawCdTraitEffect),
  })
  .loose();

export const RawCdItem = z
  .object({
    apiName: z.string().min(1),
    name: z.string().nullable(),
    desc: z.string().nullable(),
    icon: z.string().nullable(),
    isAugment: z.boolean(),
    composition: z.array(z.string()),
    associatedTraits: z.array(z.string()),
    tags: z.array(z.string()),
    effects: z.record(z.string(), z.number().nullable()).optional(),
    unique: z.boolean().optional(),
  })
  .loose();

export const RawCdSetEntry = z
  .object({
    number: z.number().int(),
    mutator: z.string().min(1),
    name: z.string(),
    champions: z.array(RawCdChampion),
    traits: z.array(RawCdTrait),
    items: z.array(z.string()),
    augments: z.array(z.string()),
  })
  .loose();

export const RawCdragon = z
  .object({
    items: z.array(RawCdItem),
    setData: z.array(RawCdSetEntry).min(1),
    sets: z.record(z.string(), z.unknown()),
  })
  .loose();

export type RawCdragonT = z.infer<typeof RawCdragon>;
export type RawCdSetEntryT = z.infer<typeof RawCdSetEntry>;
export type RawCdChampionT = z.infer<typeof RawCdChampion>;
export type RawCdTraitT = z.infer<typeof RawCdTrait>;
export type RawCdItemT = z.infer<typeof RawCdItem>;

// ---------------------------------------------------------------- DDragon --

const DdImage = z.object({ full: z.string() }).loose();

export const RawDdChampion = z
  .object({ id: z.string(), name: z.string(), tier: z.number().int().optional(), cost: z.number().int().optional(), image: DdImage })
  .loose();
export const RawDdTrait = z.object({ id: z.string(), name: z.string(), image: DdImage }).loose();
export const RawDdItem = z.object({ id: z.string(), name: z.string(), image: DdImage }).loose();
export const RawDdAugment = z
  .object({ id: z.string(), name: z.string(), description: z.string().optional(), image: DdImage })
  .loose();

export const RawDdFile = <T extends z.ZodTypeAny>(entry: T) =>
  z.object({ version: z.string(), data: z.record(z.string(), entry) }).loose();

export type RawDdChampionT = z.infer<typeof RawDdChampion>;
export type RawDdTraitT = z.infer<typeof RawDdTrait>;
export type RawDdItemT = z.infer<typeof RawDdItem>;
export type RawDdAugmentT = z.infer<typeof RawDdAugment>;
