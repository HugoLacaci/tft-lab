import { ChampionGrid } from "@/components/set/ChampionGrid";
import { requireSetData } from "@/lib/set-data";

export const metadata = { title: "Champions" };

export default function ChampionsPage() {
  const data = requireSetData();
  const traits = data.traits.map((t) => ({ id: t.id, name: t.name, icon: t.icon })).sort((a, b) => a.name.localeCompare(b.name));
  const champs = data.champions.map((c) => ({ id: c.id, name: c.name, cost: c.cost, icon: c.icon, traits: c.traits }));
  return <ChampionGrid champions={champs} traits={traits} />;
}
