import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CostPip, TraitIcon, UnitIcon } from "@/components/set/icons";
import { requireSetData } from "@/lib/set-data";
import { CURRENT_SET } from "@/lib/current-set";
import { COSTS } from "@/lib/costs";
import { renderMdx } from "@/lib/mdx";
import { newsStamps } from "@/lib/whats-new-server";
import { NewPill } from "@/components/ui/NewBadge";

export const metadata = { title: "Set hub" };

async function setProse(n: number) {
  const file = path.join(process.cwd(), "content", "sets", String(n), "overview.mdx");
  if (!fs.existsSync(file)) return null;
  return renderMdx(fs.readFileSync(file, "utf8"));
}

export default async function SetHubPage() {
  const data = requireSetData();
  const prose = await setProse(CURRENT_SET.setNumber);
  const byCost = COSTS.map((c) => ({ cost: c, champs: data.champions.filter((ch) => ch.cost === c) }));
  const traitsSorted = [...data.traits].sort((a, b) => a.name.localeCompare(b.name));
  const stamps = newsStamps();
  const cards: { label: string; n: string | number; href: string; news?: "comps" | "patch-notes" }[] = [
    { label: "Champions", n: data.champions.length, href: "/set/champions" },
    { label: "Traits", n: data.traits.length, href: "/set/traits" },
    { label: "Items", n: data.items.filter((i) => i.kind !== "other" && i.kind !== "charm").length, href: "/set/items" },
    { label: "Augments", n: data.augments.length, href: "/set/augments" },
    { label: "Wisps", n: data.items.filter((i) => i.kind === "charm" && !/_Upgrade$/i.test(i.id)).length, href: "/set/wisps" },
    { label: "Comps", n: "→", href: "/set/comps", news: "comps" },
    { label: "Patch notes", n: "→", href: "/set/patch-notes", news: "patch-notes" },
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, n, href, news }) => (
          <Link key={label} href={href} className="panel block p-4 hover:no-underline">
            <div className="display flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-gold">
              {label}
              {news ? <NewPill area={news} stamps={stamps} /> : null}
            </div>
            <div className="display mt-1 text-3xl text-gold-bright">{n}</div>
          </Link>
        ))}
      </section>

      {prose ? (
        <Panel as="section">
          <div className="prose-tft">{prose.content}</div>
        </Panel>
      ) : null}

      <section>
        <SectionTitle kicker="Roster">Champions by cost</SectionTitle>
        <div className="grid gap-4 md:grid-cols-5">
          {byCost.map(({ cost, champs }) => (
            <Panel key={cost} className="!p-3">
              <div className="mb-2 flex items-center gap-2">
                <CostPip cost={cost} />
                <span className="text-xs text-dim">{champs.length} units</span>
              </div>
              <ul className="space-y-1.5">
                {champs.map((c) => (
                  <li key={c.id}>
                    <Link href={`/set/champions/${c.id}`} className="flex items-center gap-2 text-sm text-ink hover:text-gold-bright">
                      <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={28} />
                      <span className="truncate">{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle kicker="Synergies">Traits</SectionTitle>
        <ul className="flex flex-wrap gap-2">
          {traitsSorted.map((t) => (
            <li key={t.id}>
              <Link href={`/set/traits#${t.id}`} className="chip hover:no-underline">
                <TraitIcon icon={t.icon} name={t.name} size={16} />
                {t.name}
                <span className="text-dim">{data.champions.filter((c) => c.traits.includes(t.id)).length}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
