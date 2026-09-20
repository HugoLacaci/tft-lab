import { SectionTitle } from "@/components/ui/Panel";
import { ItemCombineMatrix } from "@/components/mdx/ItemCombineMatrix";
import { ItemList } from "@/components/set/ItemList";
import { requireSetData } from "@/lib/set-data";

export const metadata = { title: "Items" };

export default function ItemsPage() {
  const data = requireSetData();
  const compName = new Map(data.items.filter((i) => i.kind === "component").map((i) => [i.id, i.name]));
  const items = data.items.map((i) => ({
    id: i.id,
    name: i.name,
    desc: i.desc,
    icon: i.icon,
    kind: i.kind,
    composition: i.composition.map((c) => compName.get(c) ?? c),
  }));
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle kicker="Combine">Component matrix</SectionTitle>
        <ItemCombineMatrix />
      </section>
      <section>
        <SectionTitle kicker="Catalogue">All items</SectionTitle>
        <ItemList items={items} />
      </section>
    </div>
  );
}
