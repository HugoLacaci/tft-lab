import { PageTitle } from "@/components/ui/Panel";
import { BoardSandbox } from "@/components/board/BoardSandbox";
import { itemLookup, traitLookup, unitLookup, loadSetData } from "@/lib/set-data";
import { GENERIC_ITEMS, GENERIC_UNITS } from "@/data/archetypes";

export const metadata = { title: "Board sandbox" };

export default function BoardSandboxPage() {
  const data = loadSetData();
  const units = { ...GENERIC_UNITS, ...unitLookup() };
  const items = { ...GENERIC_ITEMS, ...itemLookup() };
  const traitNames = Object.fromEntries(Object.values(traitLookup()).map((t) => [t.id, t.name]));
  const sample = data
    ? {
        tank: data.champions.filter((c) => c.cost === 4)[0]?.id,
        carry: data.champions.filter((c) => c.cost === 4)[1]?.id,
        one: data.champions.filter((c) => c.cost === 1)[0]?.id,
        two: data.champions.filter((c) => c.cost === 2)[0]?.id,
        three: data.champions.filter((c) => c.cost === 3)[0]?.id,
        five: data.champions.filter((c) => c.cost === 5)[0]?.id,
        items: data.items.filter((i) => i.kind === "completed").slice(0, 6).map((i) => i.id),
        comps: data.items.filter((i) => i.kind === "component").slice(0, 4).map((i) => i.id),
      }
    : null;
  return (
    <div>
      <PageTitle lede="Standalone sandbox for the board component: own and versus modes, drag-and-drop, keyboard navigation, and the responsive hex size. Resize the window down to 360px; the board must never overflow.">
        Board sandbox
      </PageTitle>
      <BoardSandbox units={units} items={items} traitNames={traitNames} sample={sample} />
    </div>
  );
}
