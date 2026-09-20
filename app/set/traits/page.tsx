import Link from "next/link";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CostPip, StyleBadge, TraitIcon, UnitIcon } from "@/components/set/icons";
import { requireSetData } from "@/lib/set-data";

export const metadata = { title: "Traits" };

export default function TraitsPage() {
  const data = requireSetData();
  const traits = [...data.traits].sort((a, b) => a.name.localeCompare(b.name));
  const champs = [...data.champions].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  const carriers = (id: string) => champs.filter((c) => c.traits.includes(id));

  return (
    <div className="space-y-10">
      <section className="grid gap-4 md:grid-cols-2">
        {traits.map((t) => (
          <Panel key={t.id} as="article" className="scroll-mt-24" >
            <div id={t.id} className="flex items-center gap-2 scroll-mt-24">
              <TraitIcon icon={t.icon} name={t.name} size={22} />
              <h2 className="text-lg">{t.name}</h2>
              <span className="ml-auto text-xs text-dim">{carriers(t.id).length} units</span>
            </div>
            {t.desc ? <p className="mt-2 text-sm text-dim">{t.desc}</p> : null}
            <ul className="mt-3 space-y-1.5 text-sm">
              {t.breakpoints.map((b) => (
                <li key={b.units} className="flex items-start gap-2">
                  <StyleBadge style={b.style}>{b.units}</StyleBadge>
                  <span>{b.desc.replace(/^\(\d+\)\s*/, "")}</span>
                </li>
              ))}
              {t.breakpoints.length === 0 ? <li className="text-dim">No breakpoints in the synced data.</li> : null}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {carriers(t.id).map((c) => (
                <Link key={c.id} href={`/set/champions/${c.id}`} title={`${c.name} (${c.cost})`}>
                  <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={32} />
                </Link>
              ))}
            </div>
          </Panel>
        ))}
      </section>

      <section>
        <SectionTitle kicker="Cross-reference">Champion × trait matrix</SectionTitle>
        <p className="mb-3 text-sm text-dim">Rows are champions sorted by cost. Scroll sideways on small screens.</p>
        <div className="table-wrap panel p-2">
          <table className="data-table" style={{ width: "auto" }}>
            <thead>
              <tr>
                <th className="sticky left-0 bg-[var(--bg-panel)]">Champion</th>
                {traits.map((t) => (
                  <th key={t.id} className="text-center" title={t.name}>
                    <Link href={`#${t.id}`}>
                      <TraitIcon icon={t.icon} name={t.name} size={16} />
                    </Link>
                    <span className="sr-only">{t.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {champs.map((c) => (
                <tr key={c.id}>
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-[var(--bg-panel)] font-normal">
                    <Link href={`/set/champions/${c.id}`} className="flex items-center gap-2 text-ink">
                      <CostPip cost={c.cost} />
                      {c.name}
                    </Link>
                  </th>
                  {traits.map((t) => (
                    <td key={t.id} className="text-center">
                      {c.traits.includes(t.id) ? (
                        <span className="inline-block h-2.5 w-2.5 rotate-45 bg-gold" aria-label={t.name} />
                      ) : (
                        <span className="sr-only">no</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
