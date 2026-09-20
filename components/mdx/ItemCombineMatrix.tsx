import { ItemIcon } from "@/components/set/icons";
import { ItemHover } from "@/components/set/ItemHover";
import { loadSetData } from "@/lib/set-data";
import { loadTiers, ranksById } from "@/lib/tiers";
import { loadMeta, metaItemsById } from "@/lib/meta";

/**
 * Component × component matrix built from the synced item compositions.
 * Rendered server-side; every cell carries the item hover card (0.5 s).
 * Scrolls horizontally on narrow screens.
 */
export function ItemCombineMatrix({ compact = false }: { compact?: boolean }) {
  const data = loadSetData();
  if (!data) return <p className="text-sm text-dim">No set data synced.</p>;
  const components = data.items.filter((i) => i.kind === "component").sort((a, b) => a.name.localeCompare(b.name));
  const compRefs = Object.fromEntries(components.map((c) => [c.id, { id: c.id, name: c.name, icon: c.icon }]));
  const tiers = loadTiers();
  const meta = loadMeta();
  const metaItems = metaItemsById(meta);
  const ranks = { ...ranksById(data.items, tiers?.items), ...Object.fromEntries(Object.values(metaItems).map((m) => [m.id, m.rank])) };
  const byPair = new Map<string, (typeof data.items)[number]>();
  for (const it of data.items) {
    if (it.composition.length !== 2) continue;
    const [a, b] = [...it.composition].sort();
    byPair.set(`${a}|${b}`, it);
  }
  const cell = (a: string, b: string) => byPair.get(`${[a, b].sort().join("|")}`);
  const size = compact ? 26 : 34;
  const card = (i: (typeof data.items)[number]) => ({ id: i.id, name: i.name, icon: i.icon, kind: i.kind, desc: i.desc, rich: i.rich, effects: i.effects, composition: i.composition, associatedTraits: i.associatedTraits });
  const stat = (id: string) => (metaItems[id] ? { avg: metaItems[id]!.avg, games: metaItems[id]!.games, patch: meta?.patch ?? "" } : undefined);
  return (
    <div className="table-wrap my-4">
      <table className="data-table" style={{ width: "auto" }}>
        <thead>
          <tr>
            <th className="sr-only">Component</th>
            {components.map((c) => (
              <th key={c.id} className="text-center">
                <ItemHover item={card(c)} components={compRefs}>
                  <ItemIcon icon={c.icon} name={c.name} size={size} />
                </ItemHover>
                <span className="sr-only">{c.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {components.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <ItemHover item={card(row)} components={compRefs}>
                    <ItemIcon icon={row.icon} name={row.name} size={size} />
                  </ItemHover>
                  {!compact ? <span className="text-xs">{row.name}</span> : null}
                </span>
              </th>
              {components.map((col) => {
                const it = cell(row.id, col.id);
                return (
                  <td key={col.id} className="text-center">
                    {it ? (
                      <ItemHover item={card(it)} components={compRefs} rank={ranks[it.id]} stat={stat(it.id)}>
                        <ItemIcon icon={it.icon} name={it.name} size={size} />
                        <span className="sr-only">{it.name}</span>
                      </ItemHover>
                    ) : (
                      <span className="text-dim">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
