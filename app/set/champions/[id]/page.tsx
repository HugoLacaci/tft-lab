import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CostPip, StyleBadge, TraitIcon, UnitIcon } from "@/components/set/icons";
import { requireSetData } from "@/lib/set-data";

export function generateStaticParams() {
  return requireSetData().champions.map((c) => ({ id: c.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = requireSetData().champions.find((x) => x.id === id);
  return { title: c ? c.name : "Champion" };
}

export default async function ChampionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = requireSetData();
  const c = data.champions.find((x) => x.id === id);
  if (!c) notFound();
  const traits = c.traits.map((t) => data.traits.find((x) => x.id === t)).filter((t): t is NonNullable<typeof t> => !!t);
  const stats: [string, number][] = [
    ["HP", c.stats.hp],
    ["AD", c.stats.ad],
    ["Armor", c.stats.armor],
    ["MR", c.stats.mr],
    ["Range", c.stats.range],
    ["Mana", c.stats.mana],
    ["Start mana", c.stats.initialMana],
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

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="md:col-span-2">
          <SectionTitle kicker="Ability">{c.ability.name || "Ability"}</SectionTitle>
          <p className="whitespace-pre-line text-sm leading-relaxed [&_.tok]:text-dim">{c.ability.desc || "No ability text in the synced data."}</p>
          <p className="mt-3 text-xs text-dim">
            Values in braces are scaling variables CommunityDragon does not resolve on this patch; the in-game tooltip has the numbers.
          </p>
        </Panel>
        <Panel>
          <SectionTitle kicker="Base stats">1★</SectionTitle>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            {stats.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-dim">{k}</dt>
                <dd className="text-right font-semibold tabular-nums text-gold-bright">{v}</dd>
              </div>
            ))}
          </dl>
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
                    <span className="text-dim">{b.desc.replace(/^\(\d+\)\s*/, "")}</span>
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
