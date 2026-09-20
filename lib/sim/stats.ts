/**
 * Turns a placed unit + items + team context into the numbers the engine
 * runs on. Star scaling, item effects, trait tiers and augment tiers all
 * land here so the engine stays a plain loop.
 *
 * Heuristics (documented for the UI):
 *   - HP ×1.8 per star, AD ×1.5 per star (TFT's long-standing rule).
 *   - Ability: cost-based base (see ABILITY_BASE) × star ×(1 + AP/100) for
 *     AP text, or AD × ratio for AD text; split when the text scales with both.
 *   - Active trait breakpoints give their holders +HP% and +damage% by style
 *     (bronze 6, silver 12, gold 20, prismatic 32, unique 10).
 *   - Augments give the team +offense%/+defense% by tier (silver 3, gold 6,
 *     prismatic 10), skewed by the words in their text; econ augments give 0.
 *   - Emblems and trait Crest/Crown augments add +1 to the trait.
 */
import type { Augment, Champion, Item, Trait, TraitStyle } from "../types";
import type { ActiveTrait, SimData, SimTeam, SimUnit, Star, TeamNotes } from "./types";

export const STAR_HP: Record<Star, number> = { 1: 1, 2: 1.8, 3: 3.24 };
export const STAR_AD: Record<Star, number> = { 1: 1, 2: 1.5, 3: 2.25 };
export const STAR_ABILITY: Record<Star, number> = { 1: 1, 2: 1.5, 3: 2.25 };

/** 1★ ability value at 100 AP, by cost (magic damage to the target before splash). */
export const ABILITY_BASE: Record<number, number> = { 1: 180, 2: 230, 3: 300, 4: 400, 5: 520 };
/** AD-scaling abilities deal AD × ratio, by cost. */
export const ABILITY_AD_RATIO: Record<number, number> = { 1: 2.2, 2: 2.6, 3: 3.0, 4: 3.4, 5: 3.8 };

export const TRAIT_BONUS: Record<TraitStyle, number> = { bronze: 0.06, silver: 0.12, gold: 0.2, prismatic: 0.32, unique: 0.1 };
export const AUGMENT_BONUS: Record<string, number> = { silver: 0.03, gold: 0.06, prismatic: 0.1 };

export interface UnitStats {
  maxHp: number;
  ad: number;
  ap: number; // 100 = baseline
  as: number; // attacks per second
  armor: number;
  mr: number;
  range: number;
  mana: number;
  initialMana: number;
  manaRegen: number; // per second
  manaPerAttack: number; // 10 + Shojin/Nashor
  critChance: number; // 0..1
  critMult: number;
  omnivamp: number; // 0..1 of all damage
  lifesteal: number; // 0..1 of attack damage
  damageAmp: number; // fraction
  durability: number; // fraction of damage prevented
  abilityCrit: boolean;
  scaling: { ad: boolean; ap: boolean };
  /** ability text keywords */
  utility: { heal: boolean; shield: boolean; stun: boolean; aoe: boolean };
  hooks: UnitHooks;
}

/** Named-item behaviours the engine knows about. */
export interface UnitHooks {
  guinsoo: number; // AS % per second stacking
  titans: { ad: number; ap: number; cap: number } | null;
  krakens: { adPerAttack: number; max: number } | null;
  warmogRegen: number; // fraction of missing HP per second... (Spirit Visage) — see engine
  dragonsClaw: number; // fraction max HP healed every 2s
  sunfire: boolean; // 1% burn + wound to nearby every 2s
  redBuff: boolean; // on-hit burn + wound
  morello: boolean;
  bramble: number; // reflect damage when hit by an attack (ICD 2s)
  ionicSpark: boolean; // MR shred aura + damage on enemy cast
  evenshroud: boolean; // armor shred aura
  voidStaff: boolean; // on-hit MR shred
  lastWhisper: boolean; // on-hit armor shred
  bloodthirsterShield: number; // fraction max HP at 40%
  steraksShield: number; // fraction of max HP at 60% (approx of "weapon's" AD gain)
  edgeOfNight: boolean; // once: heal 20% missing at 60%
  protectorsVow: boolean;
  crownguard: number; // combat-start shield fraction
  archangels: number; // AP every 5s
  blueBuff: number; // extra ADAP fraction
  gunblade: number; // fraction of damage healed to lowest ally
  giantSlayer: number;
  strikersFlail: boolean;
  steadfast: boolean;
  quicksilver: boolean;
  spiritVisage: number; // fraction missing HP per second
  adaptiveHelm: boolean;
  rabadons: number;
  deathblade: number;
}

const NO_HOOKS: UnitHooks = {
  guinsoo: 0,
  titans: null,
  krakens: null,
  warmogRegen: 0,
  dragonsClaw: 0,
  sunfire: false,
  redBuff: false,
  morello: false,
  bramble: 0,
  ionicSpark: false,
  evenshroud: false,
  voidStaff: false,
  lastWhisper: false,
  bloodthirsterShield: 0,
  steraksShield: 0,
  edgeOfNight: false,
  protectorsVow: false,
  crownguard: 0,
  archangels: 0,
  blueBuff: 0,
  gunblade: 0,
  giantSlayer: 0,
  strikersFlail: false,
  steadfast: false,
  quicksilver: false,
  spiritVisage: 0,
  adaptiveHelm: false,
  rabadons: 0,
  deathblade: 0,
};

function norm(id: string): string {
  return id.toLowerCase().replace(/^(da_|tft\d*_item_|tft_item_)/, "").replace(/radiant$/, "");
}

/** Which named-item family an item id belongs to, by its normalised suffix. */
export function itemFamily(id: string): string {
  return norm(id);
}

export function traitCounts(team: SimTeam, data: SimData): Map<string, number> {
  const counts = new Map<string, number>();
  const seen = new Set<string>(); // a champion counts once per trait
  for (const u of team.units) {
    const c = data.champions[u.championId];
    if (!c) continue;
    const ids = new Set(c.traits);
    for (const it of u.items) {
      const item = data.items[it];
      if (item?.kind === "emblem") for (const t of item.associatedTraits) ids.add(t);
    }
    for (const t of ids) {
      const k = `${c.name}|${t}`;
      if (seen.has(k)) continue;
      seen.add(k);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  for (const a of team.augments) {
    const aug = data.augments[a];
    if (!aug) continue;
    if (/crest|crown|emblem/i.test(aug.name)) for (const t of aug.associatedTraits) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

export function activeTraits(team: SimTeam, data: SimData): ActiveTrait[] {
  const counts = traitCounts(team, data);
  const out: ActiveTrait[] = [];
  for (const [id, count] of counts) {
    const t = data.traits[id];
    if (!t) continue;
    let reached = 0;
    let style: ActiveTrait["style"] = null;
    let next: number | null = null;
    for (const bp of t.breakpoints) {
      if (count >= bp.units) {
        reached = bp.units;
        style = bp.style;
      } else if (next === null) next = bp.units;
    }
    out.push({ id, name: t.name, count, reached, style, next });
  }
  return out.sort((a, b) => (b.reached > 0 ? 1 : 0) - (a.reached > 0 ? 1 : 0) || styleRank(b.style) - styleRank(a.style) || b.count - a.count);
}

function styleRank(s: ActiveTrait["style"]): number {
  return s === "prismatic" ? 5 : s === "gold" ? 4 : s === "unique" ? 3 : s === "silver" ? 2 : s === "bronze" ? 1 : 0;
}

export interface AugmentWeights {
  offense: number;
  defense: number;
  notes: TeamNotes["augments"];
}

export function augmentWeights(team: SimTeam, data: SimData): AugmentWeights {
  let offense = 0;
  let defense = 0;
  const notes: TeamNotes["augments"] = [];
  for (const id of team.augments) {
    const a: Augment | undefined = data.augments[id];
    if (!a) continue;
    const base = AUGMENT_BONUS[a.tier] ?? 0.03;
    const text = `${a.name} ${a.desc}`.toLowerCase();
    const econ = /\bgold\b|\bxp\b|reroll|interest|shop|loot|orb|component anvil|reforg|remover|duplicator/.test(text);
    const off = /attack damage|ability power|attack speed|damage amp|crit|\bdamage\b|mana/.test(text);
    const def = /health|armor|magic resist|durability|shield|heal|resist|sustain|omnivamp/.test(text);
    let o = 0;
    let d = 0;
    let note = "";
    if (econ && !off && !def) {
      note = "economy augment: no combat effect modelled";
    } else if (off && !def) {
      o = base * 1.6;
      note = `+${Math.round(o * 100)}% team damage (${a.tier})`;
    } else if (def && !off) {
      d = base * 1.6;
      note = `+${Math.round(d * 100)}% team HP (${a.tier})`;
    } else {
      o = base;
      d = base;
      note = `+${Math.round(o * 100)}% damage and HP (${a.tier})`;
    }
    offense += o;
    defense += d;
    notes.push({ id, name: a.name, tier: a.tier, offense: o, defense: d, note });
  }
  return { offense, defense, notes };
}

function utilityFromText(desc: string): UnitStats["utility"] {
  const s = desc.toLowerCase();
  return {
    heal: /\bheal/.test(s),
    shield: /\bshield/.test(s),
    stun: /\bstun|knock|root|chill|freeze|sleep/.test(s),
    aoe: /adjacent|nearby|enemies|all enemies|cone|line|area|within \d hex|hexes/.test(s),
  };
}

export function buildUnitStats(u: SimUnit, team: SimTeam, data: SimData, teamCtx: { traits: ActiveTrait[]; augments: AugmentWeights }): UnitStats | null {
  const c: Champion | undefined = data.champions[u.championId];
  if (!c) return null;
  const items = u.items.map((id) => data.items[id]).filter((i): i is Item => !!i);

  let hp = c.stats.hp * STAR_HP[u.star];
  let adMult = 1;
  let ap = 100;
  let asPct = 0;
  let armor = c.stats.armor;
  let mr = c.stats.mr;
  let manaRegen = 0;
  let manaPerAttack = 10;
  let crit = c.stats.critChance || 0.25;
  const critMult = c.stats.critMultiplier || 1.4;
  let omnivamp = 0;
  let lifesteal = 0;
  let damageAmp = 0;
  let durability = 0;
  let abilityCrit = false;
  let hpPct = 0;
  let initialMana = c.stats.initialMana;
  const hooks: UnitHooks = { ...NO_HOOKS };

  for (const it of items) {
    const e = it.effects;
    if (e.Health) hp += e.Health;
    if (e.AD) adMult += e.AD;
    if (e.AD_NotStatBar) adMult += e.AD_NotStatBar;
    if (e.AP) ap += e.AP;
    if (e.AP_NotStatBar) ap += e.AP_NotStatBar;
    if (e.AS) asPct += e.AS;
    if (e.Armor) armor += e.Armor;
    if (e.MagicResist) mr += e.MagicResist;
    if (e.ManaRegen) manaRegen += e.ManaRegen;
    if (e.CritChance) crit += e.CritChance > 1 ? e.CritChance / 100 : e.CritChance;
    if (e.StatOmnivamp) omnivamp += e.StatOmnivamp > 1 ? e.StatOmnivamp / 100 : e.StatOmnivamp;
    if (e.StatOmnivamp_NotStatBar) omnivamp += e.StatOmnivamp_NotStatBar;
    if (e.LifeSteal) lifesteal += e.LifeSteal > 1 ? e.LifeSteal / 100 : e.LifeSteal;
    if (e.DamageAmp && !/giantslayer|madreds/.test(norm(it.id))) damageAmp += e.DamageAmp;
    if (e.BonusDamage) damageAmp += e.BonusDamage;
    if (e.PercentMaxHP) hpPct += e.PercentMaxHP;
    if (e.BonusPercentHP) hpPct += e.BonusPercentHP;
    if (e.BaseDurability) durability += e.BaseDurability;
    if (e.CombatStartMana) initialMana += e.CombatStartMana;
    if (e.FlatManaRestore) manaPerAttack += e.FlatManaRestore;
    if (e.BaseManaOnHit) manaPerAttack += e.BaseManaOnHit;
    if (e.CritDamageToGive === undefined && /infinityedge|jeweledgauntlet/.test(norm(it.id))) abilityCrit = true;
    if (it.kind === "radiant") {
      // Radiant items are roughly 1.5–2× their base: approximate with a flat multiplier on what we read.
      hp += (e.Health ?? 0) * 0.6;
      adMult += (e.AD ?? 0) * 0.6;
      ap += (e.AP ?? 0) * 0.6;
      asPct += (e.AS ?? 0) * 0.6;
      armor += (e.Armor ?? 0) * 0.6;
      mr += (e.MagicResist ?? 0) * 0.6;
    }
    if (it.kind === "artifact" && Object.keys(e).length === 0) {
      // Unknown artifact: assume a strong generic offensive+defensive item.
      adMult += 0.25;
      ap += 25;
      hp += 150;
    }
    applyHooks(hooks, it);
  }
  if (hooks.blueBuff) {
    adMult *= 1 + hooks.blueBuff;
    ap *= 1 + hooks.blueBuff;
  }
  hp *= 1 + hpPct;

  // Trait tiers: holders of an active trait get the style bonus (best style wins per unit, others add half).
  const held = new Set(c.traits);
  for (const it of items) if (it.kind === "emblem") for (const t of it.associatedTraits) held.add(t);
  const bonuses = teamCtx.traits.filter((t) => held.has(t.id) && t.style).map((t) => TRAIT_BONUS[t.style as TraitStyle]);
  bonuses.sort((a, b) => b - a);
  const traitBonus = bonuses.length ? bonuses[0]! + bonuses.slice(1).reduce((a, b) => a + b, 0) * 0.5 : 0;

  const offense = 1 + traitBonus + teamCtx.augments.offense;
  const defense = 1 + traitBonus + teamCtx.augments.defense;

  const trait = (id: string) => data.traits[id];
  void trait;

  return {
    maxHp: Math.round(hp * defense),
    ad: c.stats.ad * STAR_AD[u.star] * adMult * offense,
    ap: ap * offense,
    as: (c.stats.attackSpeed || 0.7) * (1 + asPct / 100),
    armor,
    mr,
    range: Math.max(1, c.stats.range || 1),
    mana: c.stats.mana || 0,
    initialMana: Math.min(initialMana, c.stats.mana || 0),
    manaRegen,
    manaPerAttack,
    critChance: Math.min(1, crit),
    critMult,
    omnivamp: Math.min(0.6, omnivamp),
    lifesteal: Math.min(0.6, lifesteal),
    damageAmp,
    durability: Math.min(0.5, durability),
    abilityCrit,
    scaling: c.ability.scaling.ad || c.ability.scaling.ap ? c.ability.scaling : { ad: false, ap: true },
    utility: utilityFromText(c.ability.desc),
    hooks,
  };
}

function applyHooks(h: UnitHooks, it: Item): void {
  const f = norm(it.id);
  const e = it.effects;
  if (/guinsoo/.test(f)) h.guinsoo += e.AttackSpeedPerStack ?? 7;
  else if (/titansresolve/.test(f)) h.titans = { ad: e.StackingAD ?? 0.02, ap: e.StackingSP ?? 2, cap: e.StackCap ?? 25 };
  else if (/kraken|runaan/.test(f)) h.krakens = { adPerAttack: e.ADOnAttack ?? 0.035, max: e.MaxStacks ?? 15 };
  else if (/dragonsclaw/.test(f)) h.dragonsClaw += (e.PercentHealthDamage ?? 2.5) / 100;
  else if (/sunfire|redbuff$/.test(f) && /sunfire/.test(it.name.toLowerCase())) h.sunfire = true;
  else if (/rapidfirecannon/.test(f) || /red buff/.test(it.name.toLowerCase())) h.redBuff = true;
  else if (/morello/.test(f)) h.morello = true;
  else if (/bramble/.test(f)) h.bramble += e["2StarAoEDamage"] ?? 100;
  else if (/ionicspark/.test(f)) h.ionicSpark = true;
  else if (/evenshroud|spectralgauntlet/.test(f)) h.evenshroud = true;
  else if (/voidstaff|statikkshiv/.test(f)) h.voidStaff = true;
  else if (/lastwhisper/.test(f)) h.lastWhisper = true;
  else if (/bloodthirster/.test(f)) h.bloodthirsterShield += (e.ShieldHealthPercent ?? 25) / 100;
  else if (/steraks/.test(f)) h.steraksShield += e.PercentHealthShield ?? 0.4;
  else if (/edgeofnight|guardianangel/.test(f)) h.edgeOfNight = true;
  else if (/protectorsvow|frozenheart/.test(f)) h.protectorsVow = true;
  else if (/crownguard/.test(f)) h.crownguard += (e.ShieldSize ?? 25) / 100;
  else if (/archangel/.test(f)) h.archangels += e.APPerInterval ?? 20;
  else if (/bluebuff/.test(f)) h.blueBuff += e.ModifiedADAP ?? 0.1;
  else if (/gunblade/.test(f)) h.gunblade += e.AllyHealing ?? 0.2;
  else if (/giantslayer|madreds/.test(f)) h.giantSlayer += e.DamageAmp ?? 0.15;
  else if (/strikersflail|powergauntlet/.test(f)) h.strikersFlail = true;
  else if (/steadfast|nightharvester/.test(f)) h.steadfast = true;
  else if (/quicksilver/.test(f)) h.quicksilver = true;
  else if (/spiritvisage|redemption/.test(f)) h.spiritVisage += e.MissingHealthHeal ?? 0.02;
  else if (/adaptivehelm/.test(f)) h.adaptiveHelm = true;
  else if (/rabadon/.test(f)) h.rabadons += 1;
  else if (/deathblade/.test(f)) h.deathblade += 1;
}

/** Sum of trait ids a unit contributes to (for the tracker UI). */
export function unitTraitIds(u: SimUnit, data: SimData): string[] {
  const c = data.champions[u.championId];
  if (!c) return [];
  const ids = new Set(c.traits);
  for (const it of u.items) {
    const item = data.items[it];
    if (item?.kind === "emblem") for (const t of item.associatedTraits) ids.add(t);
  }
  return [...ids];
}

export type { Trait };
