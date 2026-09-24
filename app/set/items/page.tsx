import { SectionTitle } from "@/components/ui/Panel";
import { ItemCombineMatrix } from "@/components/mdx/ItemCombineMatrix";
import { ItemList } from "@/components/set/ItemList";
import { requireSetData } from "@/lib/set-data";
import { loadTiers, ranksById } from "@/lib/tiers";
import { loadMeta, metaItemsById } from "@/lib/meta";
import { inferTraitKinds } from "@/lib/trait-kinds";

export const metadata = { title: "Items" };

export default function ItemsPage() {
  const data = requireSetData();
  const components = Object.fromEntries(data.items.filter((i) => i.kind === "component").map((i) => [i.id, { id: i.id, name: i.name, icon: i.icon }]));
  const traits = Object.fromEntries(data.traits.map((t) => [t.id, { id: t.id, name: t.name, icon: t.icon }]));
  const tiers = loadTiers();
  const meta = loadMeta();
  const metaItems = metaItemsById(meta);
  // Live ranks from Riot data win; the curated file fills the gaps.
  const ranks = { ...ranksById(data.items, tiers?.items), ...Object.fromEntries(Object.values(metaItems).map((m) => [m.id, m.rank])) };
  const stats = Object.fromEntries(Object.values(metaItems).map((m) => [m.id, { avg: m.avg, games: m.games }]));
  const traitKinds = inferTraitKinds(data.champions, data.items, (id) => components[id]?.name);
  const emblemTraits = new Set(data.items.filter((i) => i.kind === "emblem").flatMap((i) => i.associatedTraits));
  const noEmblem = data.traits.filter((t) => !emblemTraits.has(t.id)).map((t) => t.name).sort();
  const items = data.items
    .filter((i) => i.kind !== "charm")
    .map((i) => ({ id: i.id, name: i.name, desc: i.desc, rich: i.rich, icon: i.icon, kind: i.kind, composition: i.composition, effects: i.effects, associatedTraits: i.associatedTraits }));
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle kicker="Combine">Component matrix</SectionTitle>
        <ItemCombineMatrix />
      </section>
      <section>
        <SectionTitle kicker="Catalogue">All items</SectionTitle>
        <p className="mb-3 text-xs text-dim">
          Hex badges are the item&apos;s strength this patch (S best → F worst).{" "}
          {meta ? `Ranks and average placements come from ${meta.matches} top-ladder ranked games on patch ${meta.patch} (synced ${meta.syncedAt.slice(0, 10)}); ` : ""}
          {tiers ? `items without live data use the curated list (${tiers.patch}, ${tiers.verifiedOn}); ` : ""}
          no badge means unranked.
        </p>
        <ItemList items={items} components={components} traits={traits} traitKinds={traitKinds} ranks={ranks} stats={stats} patch={meta?.patch ?? ""} noEmblem={noEmblem} />
      </section>
    </div>
  );
}
