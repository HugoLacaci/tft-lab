/**
 * One fight. Discrete ticks of DT seconds on the 8×7 versus grid.
 *
 * Per tick a live unit: regenerates, acquires a target (nearest enemy, sticky
 * until it dies), moves one hex towards it every MOVE_INTERVAL if out of
 * range, otherwise attacks on its attack timer or casts when mana is full.
 *
 * Damage: physical is reduced by armor (100/(100+armor)), magic by MR;
 * durability reduces both; shields absorb first. Mana: +manaPerAttack per
 * attack, +1% of pre-mitigation +7% of post-mitigation damage taken (capped
 * 42.5 per hit), mana-locked for 1s after a cast.
 *
 * Abilities are heuristic (no numbers upstream): see stats.ts.
 */
import { cellKey, hexDistance, neighbours, toCell, type Cell } from "./geometry";
import { ABILITY_AD_RATIO, ABILITY_BASE, STAR_ABILITY, buildUnitStats, activeTraits, augmentWeights, type UnitStats } from "./stats";
import type { Side, SimData, SimTeam, Star, TeamNotes } from "./types";

export const DT = 0.1;
const MOVE_INTERVAL = 0.55;
const CAST_TIME = 0.4;
const MANA_LOCK = 1.0;
const MAX_MANA_FROM_DAMAGE = 42.5;

export interface Fighter {
  key: string;
  side: Side;
  championId: string;
  name: string;
  cost: number;
  star: Star;
  items: string[];
  s: UnitStats;
  cell: Cell;
  hp: number;
  maxHp: number;
  shield: number;
  shieldUntil: number;
  mana: number;
  alive: boolean;
  target: Fighter | null;
  attackTimer: number; // seconds until next attack
  moveTimer: number;
  manaLockUntil: number;
  stunUntil: number;
  castingUntil: number;
  // stacking / once-per-combat state
  guinsooStacks: number;
  titanStacks: number;
  krakenStacks: number;
  archangelStacks: number;
  usedBt: boolean;
  usedSterak: boolean;
  usedEon: boolean;
  usedVow: boolean;
  bramble: number; // ICD timer
  sunfireTimer: number;
  dragonTimer: number;
  armorShredUntil: number;
  mrShredUntil: number;
  burnUntil: number;
  woundUntil: number;
  flailStacks: number;
  flailUntil: number;
  // tallies
  dealt: number;
  taken: number;
  healed: number;
  kills: number;
  casts: number;
  diedAt: number;
}

export interface FightOutcome {
  winner: Side | "draw";
  duration: number;
  fighters: Fighter[];
}

export function prepareTeam(side: Side, team: SimTeam, data: SimData): { fighters: Fighter[]; notes: TeamNotes } {
  const traits = activeTraits(team, data);
  const aug = augmentWeights(team, data);
  const fighters: Fighter[] = [];
  for (const u of team.units) {
    const c = data.champions[u.championId];
    const s = buildUnitStats(u, team, data, { traits, augments: aug });
    if (!c || !s) continue;
    fighters.push({
      key: `${side}:${u.row},${u.col}`,
      side,
      championId: u.championId,
      name: c.name,
      cost: c.cost,
      star: u.star,
      items: u.items,
      s,
      cell: toCell(side, u.row, u.col),
      hp: s.maxHp,
      maxHp: s.maxHp,
      shield: s.hooks.crownguard ? s.maxHp * s.hooks.crownguard : 0,
      shieldUntil: s.hooks.crownguard ? 8 : 0,
      mana: s.initialMana,
      alive: true,
      target: null,
      attackTimer: 0,
      moveTimer: 0,
      manaLockUntil: 0,
      stunUntil: 0,
      castingUntil: 0,
      guinsooStacks: 0,
      titanStacks: 0,
      krakenStacks: 0,
      archangelStacks: 0,
      usedBt: false,
      usedSterak: false,
      usedEon: false,
      usedVow: false,
      bramble: 0,
      sunfireTimer: 0,
      dragonTimer: 0,
      armorShredUntil: 0,
      mrShredUntil: 0,
      burnUntil: 0,
      woundUntil: 0,
      flailStacks: 0,
      flailUntil: 0,
      dealt: 0,
      taken: 0,
      healed: 0,
      kills: 0,
      casts: 0,
      diedAt: -1,
    });
  }
  return { fighters, notes: { traits, augments: aug.notes } };
}

export function fight(blue: Fighter[], red: Fighter[], rng: () => number, maxSeconds: number): FightOutcome {
  const all = [...blue, ...red];
  const occupied = new Map<string, Fighter>();
  for (const f of all) {
    f.attackTimer = rng() * 0.3; // stagger the first attacks
    occupied.set(cellKey(f.cell), f);
  }
  let t = 0;
  const alive = (side: Side) => all.filter((f) => f.alive && f.side === side);
  const enemiesOf = (f: Fighter) => all.filter((o) => o.alive && o.side !== f.side);
  const alliesOf = (f: Fighter) => all.filter((o) => o.alive && o.side === f.side);

  const effArmor = (f: Fighter) => f.s.armor * (f.armorShredUntil > t ? 0.7 : 1);
  const effMr = (f: Fighter) => f.s.mr * (f.mrShredUntil > t ? 0.7 : 1);

  const damage = (src: Fighter | null, dst: Fighter, raw: number, kind: "physical" | "magic" | "true", fromAttack: boolean): number => {
    if (!dst.alive) return 0;
    let mult = 1;
    if (kind === "physical") mult = 100 / (100 + effArmor(dst));
    else if (kind === "magic") mult = 100 / (100 + effMr(dst));
    let post = raw * mult * (1 - dst.s.durability);
    if (dst.s.hooks.steadfast && dst.hp / dst.maxHp > 0.5) post *= 0.85;
    if (fromAttack && dst.s.hooks.bramble) post *= 0.95;
    // shields first
    if (dst.shield > 0 && dst.shieldUntil > t) {
      const absorbed = Math.min(dst.shield, post);
      dst.shield -= absorbed;
      post -= absorbed;
    }
    dst.hp -= post;
    dst.taken += post;
    if (src) src.dealt += post;
    // mana from damage taken
    if (dst.manaLockUntil <= t) dst.mana += Math.min(MAX_MANA_FROM_DAMAGE, raw * 0.01 + post * 0.07);
    // once-per-combat thresholds
    thresholds(dst);
    if (dst.hp <= 0) {
      dst.alive = false;
      dst.diedAt = t;
      occupied.delete(cellKey(dst.cell));
      if (src) src.kills++;
    }
    return post;
  };

  const heal = (f: Fighter, amount: number) => {
    if (!f.alive || amount <= 0) return;
    if (f.woundUntil > t) amount *= 0.67;
    const real = Math.min(amount, f.maxHp - f.hp);
    f.hp += real;
    f.healed += real;
  };

  const thresholds = (f: Fighter) => {
    const pct = f.hp / f.maxHp;
    const h = f.s.hooks;
    if (h.bloodthirsterShield && !f.usedBt && pct <= 0.4) {
      f.usedBt = true;
      f.shield += f.maxHp * h.bloodthirsterShield;
      f.shieldUntil = t + 5;
    }
    if (h.steraksShield && !f.usedSterak && pct <= 0.6) {
      f.usedSterak = true;
      f.shield += f.maxHp * 0.25;
      f.shieldUntil = t + 4;
    }
    if (h.edgeOfNight && !f.usedEon && pct <= 0.6) {
      f.usedEon = true;
      heal(f, (f.maxHp - f.hp) * 0.2);
      f.stunUntil = 0;
    }
    if (h.protectorsVow && !f.usedVow && pct <= 0.4) {
      f.usedVow = true;
      f.shield += f.maxHp * 0.2;
      f.shieldUntil = t + 60;
      f.mana += 15;
    }
  };

  const onHitEffects = (src: Fighter, dst: Fighter) => {
    const h = src.s.hooks;
    if (h.voidStaff) dst.mrShredUntil = t + 5;
    if (h.lastWhisper) dst.armorShredUntil = t + 3;
    if (h.redBuff || h.morello) {
      dst.burnUntil = Math.max(dst.burnUntil, t + 5);
      dst.woundUntil = Math.max(dst.woundUntil, t + 5);
    }
    if (h.gunblade) {
      const allies = alliesOf(src);
      let low: Fighter | null = null;
      for (const a of allies) if (!low || a.hp / a.maxHp < low.hp / low.maxHp) low = a;
      if (low) heal(low, 0);
    }
  };

  const outgoingMult = (src: Fighter, dst: Fighter) => {
    let m = 1 + src.s.damageAmp;
    if (src.s.hooks.giantSlayer && dst.maxHp >= 1750) m += src.s.hooks.giantSlayer;
    if (src.s.hooks.strikersFlail && src.flailUntil > t) m += 0.05 * src.flailStacks;
    if (src.s.hooks.titans) m += Math.min(src.titanStacks, src.s.hooks.titans.cap) * src.s.hooks.titans.ad;
    return m;
  };

  const currentAd = (f: Fighter) => {
    let ad = f.s.ad;
    if (f.s.hooks.krakens) ad *= 1 + f.krakenStacks * f.s.hooks.krakens.adPerAttack;
    return ad;
  };
  const currentAp = (f: Fighter) => {
    let ap = f.s.ap + f.archangelStacks;
    if (f.s.hooks.titans) ap += Math.min(f.titanStacks, f.s.hooks.titans.cap) * f.s.hooks.titans.ap;
    return ap;
  };
  const currentAs = (f: Fighter) => Math.min(5, f.s.as * (1 + (f.guinsooStacks * f.s.hooks.guinsoo) / 100));

  const attack = (f: Fighter, target: Fighter) => {
    const crit = rng() < f.s.critChance;
    let raw = currentAd(f) * (crit ? f.s.critMult : 1) * outgoingMult(f, target);
    if (f.s.hooks.deathblade) raw *= 1.0; // stat already applied
    const post = damage(f, target, raw, "physical", true);
    if (f.s.lifesteal || f.s.omnivamp) heal(f, post * (f.s.lifesteal + f.s.omnivamp));
    if (f.s.hooks.gunblade) {
      const allies = alliesOf(f);
      let low: Fighter | null = null;
      for (const a of allies) if (!low || a.hp / a.maxHp < low.hp / low.maxHp) low = a;
      if (low) heal(low, post * f.s.hooks.gunblade);
    }
    if (f.manaLockUntil <= t) f.mana += f.s.manaPerAttack;
    if (f.s.hooks.krakens) f.krakenStacks = Math.min(f.s.hooks.krakens.max, f.krakenStacks + 1);
    if (f.s.hooks.titans) f.titanStacks++;
    if (f.s.hooks.strikersFlail && crit) {
      f.flailStacks = Math.min(4, f.flailStacks + 1);
      f.flailUntil = t + 5;
    }
    onHitEffects(f, target);
    // Bramble reflect
    if (target.alive && target.s.hooks.bramble && target.bramble <= t) {
      target.bramble = t + 2;
      for (const n of neighbours(target.cell)) {
        const o = occupied.get(cellKey(n));
        if (o && o.side !== target.side) damage(target, o, target.s.hooks.bramble, "magic", false);
      }
    }
    if (target.s.hooks.titans) target.titanStacks++;
  };

  const cast = (f: Fighter, target: Fighter) => {
    f.casts++;
    f.mana = 0;
    f.manaLockUntil = t + MANA_LOCK;
    f.castingUntil = t + CAST_TIME;
    const star = STAR_ABILITY[f.star];
    const ap = currentAp(f) / 100;
    const apPart = (ABILITY_BASE[f.cost] ?? 250) * star * ap;
    const adPart = currentAd(f) * (ABILITY_AD_RATIO[f.cost] ?? 3) * star;
    let value: number;
    let kind: "physical" | "magic";
    if (f.s.scaling.ad && f.s.scaling.ap) {
      value = apPart * 0.5 + adPart * 0.5;
      kind = "physical";
    } else if (f.s.scaling.ad) {
      value = adPart;
      kind = "physical";
    } else {
      value = apPart;
      kind = "magic";
    }
    const crit = f.s.abilityCrit && rng() < f.s.critChance;
    if (crit) value *= f.s.critMult;
    value *= outgoingMult(f, target);
    const u = f.s.utility;
    // utility abilities trade damage for the effect
    let dmgShare = 1;
    if (u.heal) dmgShare -= 0.35;
    if (u.shield) dmgShare -= 0.25;
    if (u.stun) dmgShare -= 0.15;
    dmgShare = Math.max(0.3, dmgShare);
    const dealtMain = damage(f, target, value * dmgShare, kind, false);
    if (f.s.omnivamp) heal(f, dealtMain * f.s.omnivamp);
    if (u.aoe) {
      for (const n of neighbours(target.cell)) {
        const o = occupied.get(cellKey(n));
        if (o && o.side !== f.side && o !== target) damage(f, o, value * dmgShare * 0.45, kind, false);
      }
    }
    if (u.heal) {
      const allies = alliesOf(f);
      let low: Fighter | null = null;
      for (const a of allies) if (!low || a.hp / a.maxHp < low.hp / low.maxHp) low = a;
      if (low) heal(low, value * 0.5);
    }
    if (u.shield) {
      f.shield += value * 0.45;
      f.shieldUntil = t + 4;
    }
    if (u.stun && target.alive && !target.s.hooks.quicksilver) target.stunUntil = Math.max(target.stunUntil, t + 1.0 * (f.star === 3 ? 1.5 : 1));
    if (f.s.hooks.morello || f.s.hooks.redBuff) {
      target.burnUntil = Math.max(target.burnUntil, t + 5);
      target.woundUntil = Math.max(target.woundUntil, t + 5);
    }
    if (f.s.hooks.voidStaff) target.mrShredUntil = t + 5;
    if (f.s.hooks.lastWhisper) target.armorShredUntil = t + 3;
    // Ionic spark on enemy cast
    for (const e of enemiesOf(f)) if (e.s.hooks.ionicSpark && hexDistance(e.cell, f.cell) <= 2) damage(e, f, f.s.mana * 1.5, "magic", false);
  };

  const pickTarget = (f: Fighter): Fighter | null => {
    const enemies = enemiesOf(f);
    if (!enemies.length) return null;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      const d = hexDistance(f.cell, e.cell) + rng() * 0.01;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  };

  const stepTowards = (f: Fighter, target: Fighter) => {
    let best: Cell | null = null;
    let bestD = hexDistance(f.cell, target.cell);
    for (const n of neighbours(f.cell)) {
      if (occupied.has(cellKey(n))) continue;
      const d = hexDistance(n, target.cell);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (best) {
      occupied.delete(cellKey(f.cell));
      f.cell = best;
      occupied.set(cellKey(best), f);
    }
  };

  while (t < maxSeconds) {
    const b = alive("blue");
    const r = alive("red");
    if (!b.length || !r.length) break;
    for (const f of all) {
      if (!f.alive) continue;
      // periodic effects
      if (f.s.manaRegen && f.manaLockUntil <= t) f.mana += f.s.manaRegen * DT;
      if (f.s.hooks.guinsoo) f.guinsooStacks += DT;
      if (f.s.hooks.archangels && Math.floor(t / 5) !== Math.floor((t - DT) / 5) && t > 0) f.archangelStacks += f.s.hooks.archangels;
      if (f.s.hooks.spiritVisage) heal(f, (f.maxHp - f.hp) * f.s.hooks.spiritVisage * DT);
      if (f.s.hooks.dragonsClaw) {
        f.dragonTimer += DT;
        if (f.dragonTimer >= 2) {
          f.dragonTimer = 0;
          heal(f, f.maxHp * f.s.hooks.dragonsClaw);
        }
      }
      if (f.s.hooks.sunfire) {
        f.sunfireTimer += DT;
        if (f.sunfireTimer >= 2) {
          f.sunfireTimer = 0;
          for (const e of enemiesOf(f))
            if (hexDistance(e.cell, f.cell) <= 2) {
              e.burnUntil = Math.max(e.burnUntil, t + 10);
              e.woundUntil = Math.max(e.woundUntil, t + 10);
            }
        }
      }
      if (f.s.hooks.ionicSpark || f.s.hooks.evenshroud) {
        for (const e of enemiesOf(f))
          if (hexDistance(e.cell, f.cell) <= 2) {
            if (f.s.hooks.ionicSpark) e.mrShredUntil = Math.max(e.mrShredUntil, t + DT * 2);
            if (f.s.hooks.evenshroud) e.armorShredUntil = Math.max(e.armorShredUntil, t + DT * 2);
          }
      }
      if (f.burnUntil > t) damage(null, f, f.maxHp * 0.01 * DT, "true", false);
      if (f.shieldUntil <= t) f.shield = 0;
      if (!f.alive) continue;

      if (f.stunUntil > t || f.castingUntil > t) continue;

      if (!f.target || !f.target.alive) f.target = pickTarget(f);
      const target = f.target;
      if (!target) continue;
      const dist = hexDistance(f.cell, target.cell);
      if (dist > f.s.range) {
        f.moveTimer -= DT;
        if (f.moveTimer <= 0) {
          f.moveTimer = MOVE_INTERVAL;
          stepTowards(f, target);
        }
        // melee units that cannot reach retarget to something adjacent if any
        if (f.s.range === 1 && hexDistance(f.cell, target.cell) > 1) {
          for (const n of neighbours(f.cell)) {
            const o = occupied.get(cellKey(n));
            if (o && o.side !== f.side) {
              f.target = o;
              break;
            }
          }
        }
        continue;
      }
      if (f.s.mana > 0 && f.mana >= f.s.mana) {
        cast(f, target);
        continue;
      }
      f.attackTimer -= DT;
      if (f.attackTimer <= 0) {
        f.attackTimer += 1 / currentAs(f);
        attack(f, target);
      }
    }
    t += DT;
  }
  const b = alive("blue");
  const r = alive("red");
  let winner: Side | "draw";
  if (b.length && !r.length) winner = "blue";
  else if (r.length && !b.length) winner = "red";
  else if (!b.length && !r.length) winner = "draw";
  else {
    // overtime tie-break: more units alive, then more total HP fraction
    const bh = b.reduce((a, f) => a + f.hp / f.maxHp, 0);
    const rh = r.reduce((a, f) => a + f.hp / f.maxHp, 0);
    winner = b.length !== r.length ? (b.length > r.length ? "blue" : "red") : bh === rh ? "draw" : bh > rh ? "blue" : "red";
  }
  return { winner, duration: t, fighters: all };
}
