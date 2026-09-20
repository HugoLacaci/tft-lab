import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CostPip, TraitIcon, UnitIcon } from "@/components/set/icons";
import { requireSetData } from "@/lib/set-data";
import { CURRENT_SET } from "@/lib/current-set";
import { COSTS } from "@/lib/costs";
import { renderMdx } from "@/lib/mdx";

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

  return (
    <div className="space-y-10">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Champions", data.champions.length, "/set/champions"],
          ["Traits", data.traits.length, "/set/traits"],
          ["Items", data.items.filter((i) => i.kind !== "other" && i.kind !== "charm").length, "/set/items"],
          ["Augments", data.augments.length, "/set/augments"],
          ["Wisps", data.items.filter((i) => i.kind === "charm" && !/_Upgrade$/i.test(i.id)).length, "/set/wisps"],
          ["Comps", "→", "/set/comps"],
          ["Patch notes", "→", "/set/patch-notes"],
        ].map(([label, n, href]) => (
          <Link key={String(label)} href={String(href)} className="panel block p-4 hover:no-underline">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">{label}</div>
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
