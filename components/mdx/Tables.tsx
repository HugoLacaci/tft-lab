import { getConstants } from "@/data/constants";
import { COSTS } from "@/lib/costs";

function Footnote({ verifiedOn, source }: { verifiedOn: string; source: string }) {
  return (
    <p className="mt-2 text-[0.7rem] text-dim">
      Verified {verifiedOn} ·{" "}
      <a href={source} target="_blank" rel="noopener noreferrer">
        source
      </a>
      . Re-verify every set.
    </p>
  );
}

export function OddsTable() {
  const k = getConstants();
  return (
    <div className="my-4">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Level</th>
              {COSTS.map((c) => (
                <th key={c} className="num" style={{ color: `var(--cost-${c})` }}>
                  {c}-cost
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {k.shopOdds.map((row) => (
              <tr key={row.level}>
                <td>{row.level}</td>
                {row.odds.map((o, i) => (
                  <td key={i} className="num">
                    {o}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footnote verifiedOn={k.verifiedOn} source={k.sources.shopOdds} />
    </div>
  );
}

export function PoolTable() {
  const k = getConstants();
  return (
    <div className="my-4">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cost</th>
              <th className="num">Copies per champion</th>
              <th className="num">Distinct champions</th>
              <th className="num">Total copies in pool</th>
            </tr>
          </thead>
          <tbody>
            {COSTS.map((c) => (
              <tr key={c}>
                <td style={{ color: `var(--cost-${c})` }}>{c}-cost</td>
                <td className="num">{k.poolSize[c]}</td>
                <td className="num">{k.distinctChampions[c]}</td>
                <td className="num">{k.poolSize[c] * k.distinctChampions[c]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footnote verifiedOn={k.verifiedOn} source={k.sources.poolSize} />
    </div>
  );
}

export function InterestTable() {
  const k = getConstants();
  const rows = [];
  for (let g = 0; g <= k.interest.cap * k.interest.per; g += k.interest.per) rows.push(g);
  return (
    <div className="my-4">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Gold banked</th>
              <th className="num">Interest</th>
              <th className="num">Win streak</th>
              <th className="num">Streak gold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => (
              <tr key={g}>
                <td>{g}+</td>
                <td className="num">{Math.min(k.interest.cap, Math.floor(g / k.interest.per))}</td>
                <td className="num">{k.streakGold[i] ? `${k.streakGold[i].streak}` : ""}</td>
                <td className="num">{k.streakGold[i] ? `+${k.streakGold[i].gold}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-dim">
        Base income {k.baseIncome} per round from stage 2. Interest and streak columns are independent tables shown side by side.
      </p>
      <Footnote verifiedOn={k.verifiedOn} source={k.sources.interest} />
    </div>
  );
}

export function LevelTable() {
  const k = getConstants();
  let cum = 0;
  return (
    <div className="my-4">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>To level</th>
              <th className="num">XP needed</th>
              <th className="num">Cumulative</th>
              <th className="num">Gold to buy (4 XP / 4g)</th>
              <th>Standard timing</th>
            </tr>
          </thead>
          <tbody>
            {k.xpToLevel.map((row) => {
              cum += row.xp;
              return (
                <tr key={row.level}>
                  <td>{row.level}</td>
                  <td className="num">{row.xp}</td>
                  <td className="num">{cum}</td>
                  <td className="num">{row.xp}</td>
                  <td>{k.standardTimings[row.level] ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-dim">
        You gain {k.passiveXp} XP per round passively; the gold column assumes you buy the whole level.
      </p>
      <Footnote verifiedOn={k.verifiedOn} source={k.sources.xp} />
    </div>
  );
}
