import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CostPip, StyleBadge, TraitIcon, UnitIcon } from "@/components/set/icons";
import { RichText } from "@/components/set/RichText";
import { StatChip } from "@/components/set/StatIcon";
import { requireSetData } from "@/lib/set-data";
import { STAR_AD, STAR_HP } from "@/lib/sim/stats";
import type { StatKey } from "@/lib/stat-meta";

export function generateStaticParams() {
  return requireSetData().champions.map((c) => ({ id: c.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = requireSetData().champions.find((x) => x.id === id);
  return { title: c ? c.name : "Champion" };
}

const STARS = [1, 2, 3] as const;
const STAR_COLOR: Record<1 | 2 | 3, string> = { 1: "#b08a4a", 2: "#c8d0d8", 3: "#ffb642" };

export default async function ChampionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = requireSetData();
  const c = data.champions.find((x) => x.id === id);
  if (!c) notFound();
  const traits = c.traits.map((t) => data.traits.find((x) => x.id === t)).filter((t): t is NonNullable<typeof t> => !!t);
  const s = c.stats;
  const r0 = (v: number) => String(Math.round(v));
  const r2 = (v: number) => (Math.round(v * 100) / 100).toString();
  /** Per-star rows: HP ×1.8 and AD ×1.5 per star (the same constants the fight simulator uses); the rest does not scale with stars. */
  const rows: { label: string; stat?: StatKey; values: [string, string, string]; scales: boolean; note?: string }[] = [
    { label: "Health", stat: "HP", values: [r0(s.hp * STAR_HP[1]), r0(s.hp * STAR_HP[2]), r0(s.hp * STAR_HP[3])], scales: true },
    { label: "Attack damage", stat: "AD", values: [r0(s.ad * STAR_AD[1]), r0(s.ad * STAR_AD[2]), r0(s.ad * STAR_AD[3])], scales: true },
    { label: "DPS (auto-attacks)", values: [r0(s.ad * STAR_AD[1] * s.attackSpeed), r0(s.ad * STAR_AD[2] * s.attackSpeed), r0(s.ad * STAR_AD[3] * s.attackSpeed)], scales: true, note: "AD × attack speed, before items, crits and armour" },
    { label: "Attack speed", stat: "AS", values: [r2(s.attackSpeed), r2(s.attackSpeed), r2(s.attackSpeed)], scales: false },
    { label: "Armor", stat: "Armor", values: [r0(s.armor), r0(s.armor), r0(s.armor)], scales: false },
    { label: "Magic resist", stat: "MR", values: [r0(s.mr), r0(s.mr), r0(s.mr)], scales: false },
    { label: "Range", stat: "Range", values: [r0(s.range), r0(s.range), r0(s.range)], scales: false },
    { label: "Mana", stat: "Mana", values: [`${r0(s.initialMana)} / ${r0(s.mana)}`, `${r0(s.initialMana)} / ${r0(s.mana)}`, `${r0(s.initialMana)} / ${r0(s.mana)}`], scales: false, note: "start / to cast" },
    { label: "Crit chance", stat: "Crit", values: [`${r0(s.critChance * 100)}%`, `${r0(s.critChance * 100)}%`, `${r0(s.critChance * 100)}%`], scales: false },
  ];
  return (
    <div className="space-y-8">
      <Link href="/set/champions" className="text-sm">
        ← All champions
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={88} />
        <div>
          <div className="flex items-center gap-2">
            <CostPip cost={c.cost} />
            <h2 className="text-3xl">{c.name}</h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {traits.map((t) => (
              <Link key={t.id} href={`/set/traits#${t.id}`} className="chip hover:no-underline">
                <TraitIcon icon={t.icon} name={t.name} size={14} />
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <Panel className="md:col-span-3">
          <SectionTitle kicker="Ability">{c.ability.name || "Ability"}</SectionTitle>
          <p className="text-sm leading-relaxed">
            <RichText text={c.ability.rich || c.ability.desc || "No ability text in the synced data."} words />
          </p>
          <p className="mt-3 text-xs text-dim">
            Values in braces are scaling variables CommunityDragon does not resolve on this patch; the in-game tooltip has the numbers.
          </p>
        </Panel>
        <Panel className="md:col-span-2">
          <SectionTitle kicker="Base stats">By star level</SectionTitle>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  {STARS.map((st) => (
                    <th key={st} className="num" style={{ color: STAR_COLOR[st] }}>
                      {"★".repeat(st)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="text-dim">
                      {row.stat ? <StatChip stat={row.stat} label={row.label} /> : row.label}
                      {row.note ? <span className="block text-[0.65rem] text-dim/80">{row.note}</span> : null}
                    </td>
                    {row.values.map((v, i) => (
                      <td key={i} className={`num whitespace-nowrap font-semibold ${row.scales ? "text-gold-bright" : "text-dim"}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-dim">Health scales ×1.8 and attack damage ×1.5 per star; armour, magic resist, range, mana and attack speed do not. Ability damage also grows with stars, but Riot does not ship those numbers.</p>
        </Panel>
      </div>

      <section>
        <SectionTitle kicker="Synergies">Traits</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {traits.map((t) => (
            <Panel key={t.id}>
              <div className="flex items-center gap-2">
                <TraitIcon icon={t.icon} name={t.name} size={20} />
                <Link href={`/set/traits#${t.id}`} className="display text-gold-bright">
                  {t.name}
                </Link>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {t.breakpoints.map((b) => (
                  <li key={b.units} className="flex gap-2">
                    <StyleBadge style={b.style}>{b.units}</StyleBadge>
                    <RichText text={b.desc.replace(/^\(\d+\)\s*/, "")} className="text-dim" words />
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.champions
                  .filter((o) => o.traits.includes(t.id) && o.id !== c.id)
                  .sort((a, b) => a.cost - b.cost)
                  .map((o) => (
                    <Link key={o.id} href={`/set/champions/${o.id}`} title={o.name}>
                      <UnitIcon icon={o.icon} name={o.name} cost={o.cost} size={28} />
                    </Link>
                  ))}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <Panel>
        <SectionTitle kicker="Items">Common builds</SectionTitle>
        <p className="text-sm text-dim">
          TFT Lab does not track item win rates and does not scrape the sites that do. For the current best-in-slot on {c.name}, check{" "}
          <Link href="/resources">a stats site</Link>, then read <Link href="/guides/items">the Items guide</Link> for how to decide when the
          BIS is not on the table.
        </p>
      </Panel>
    </div>
  );
}
