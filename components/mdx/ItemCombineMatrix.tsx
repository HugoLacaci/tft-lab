import { ItemIcon } from "@/components/set/icons";
import { loadSetData } from "@/lib/set-data";

/**
 * Component × component matrix built from the synced item compositions.
 * Rendered server-side; scrolls horizontally on narrow screens.
 */
export function ItemCombineMatrix({ compact = false }: { compact?: boolean }) {
  const data = loadSetData();
  if (!data) return <p className="text-sm text-dim">No set data synced.</p>;
  const components = data.items.filter((i) => i.kind === "component").sort((a, b) => a.name.localeCompare(b.name));
  const byPair = new Map<string, (typeof data.items)[number]>();
  for (const it of data.items) {
    if (it.composition.length !== 2) continue;
    const [a, b] = [...it.composition].sort();
    byPair.set(`${a}|${b}`, it);
  }
  const cell = (a: string, b: string) => byPair.get(`${[a, b].sort().join("|")}`);
  const size = compact ? 26 : 34;
  return (
    <div className="table-wrap my-4">
      <table className="data-table" style={{ width: "auto" }}>
        <thead>
          <tr>
            <th className="sr-only">Component</th>
            {components.map((c) => (
              <th key={c.id} className="text-center">
                <ItemIcon icon={c.icon} name={c.name} size={size} />
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
                  <ItemIcon icon={row.icon} name={row.name} size={size} />
                  {!compact ? <span className="text-xs">{row.name}</span> : null}
                </span>
              </th>
              {components.map((col) => {
                const it = cell(row.id, col.id);
                return (
                  <td key={col.id} className="text-center">
                    {it ? (
                      <span title={it.name}>
                        <ItemIcon icon={it.icon} name={it.name} size={size} />
                        <span className="sr-only">{it.name}</span>
                      </span>
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
