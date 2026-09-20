import { fight, prepareTeam } from "./engine";
import { mulberry32 } from "./rng";
import type { SimConfig, SimData, SimResult, SimTeam, UnitReport } from "./types";

export const DEFAULT_CONFIG: SimConfig = { runs: 200, seed: 7, maxSeconds: 30 };

/** Monte-Carlo the fight and average the tallies. Pure; safe to call in a worker or in tests. */
export function simulate(blue: SimTeam, red: SimTeam, data: SimData, cfg: Partial<SimConfig> = {}): SimResult {
  const c = { ...DEFAULT_CONFIG, ...cfg };
  const rng = mulberry32(c.seed);
  const acc = new Map<string, UnitReport & { hpLeftSum: number; timeSum: number }>();
  let blueWins = 0;
  let redWins = 0;
  let draws = 0;
  let durSum = 0;
  let bSurv = 0;
  let rSurv = 0;
  let bStars = 0;
  let rStars = 0;
  let notes: SimResult["notes"] | null = null;

  for (let i = 0; i < c.runs; i++) {
    const b = prepareTeam("blue", blue, data);
    const r = prepareTeam("red", red, data);
    if (!notes) notes = { blue: b.notes, red: r.notes };
    const out = fight(b.fighters, r.fighters, rng, c.maxSeconds);
    if (out.winner === "blue") blueWins++;
    else if (out.winner === "red") redWins++;
    else draws++;
    durSum += out.duration;
    for (const f of out.fighters) {
      if (f.alive) {
        if (f.side === "blue") {
          bSurv++;
          bStars += f.star;
        } else {
          rSurv++;
          rStars += f.star;
        }
      }
      let rep = acc.get(f.key);
      if (!rep) {
        rep = {
          key: f.key,
          side: f.side,
          championId: f.championId,
          name: f.name,
          star: f.star,
          items: f.items,
          damageDealt: 0,
          damageTaken: 0,
          healing: 0,
          kills: 0,
          casts: 0,
          survived: 0,
          avgTimeAlive: 0,
          avgHpLeft: 0,
          hpLeftSum: 0,
          timeSum: 0,
        };
        acc.set(f.key, rep);
      }
      rep.damageDealt += f.dealt;
      rep.damageTaken += f.taken;
      rep.healing += f.healed;
      rep.kills += f.kills;
      rep.casts += f.casts;
      if (f.alive) rep.survived++;
      rep.hpLeftSum += f.alive ? Math.max(0, f.hp) / f.maxHp : 0;
      rep.timeSum += f.alive ? out.duration : f.diedAt;
    }
  }
  const n = Math.max(1, c.runs);
  const units: UnitReport[] = [...acc.values()].map((r) => ({
    key: r.key,
    side: r.side,
    championId: r.championId,
    name: r.name,
    star: r.star,
    items: r.items,
    damageDealt: r.damageDealt / n,
    damageTaken: r.damageTaken / n,
    healing: r.healing / n,
    kills: r.kills / n,
    casts: r.casts / n,
    survived: r.survived / n,
    avgTimeAlive: r.timeSum / n,
    avgHpLeft: r.hpLeftSum / n,
  }));
  return {
    runs: c.runs,
    blueWins,
    redWins,
    draws,
    avgDuration: durSum / n,
    avgBlueSurvivors: bSurv / n,
    avgRedSurvivors: rSurv / n,
    avgBlueSurvivorStars: bStars / n,
    avgRedSurvivorStars: rStars / n,
    units,
    notes: notes ?? { blue: { traits: [], augments: [] }, red: { traits: [], augments: [] } },
  };
}
