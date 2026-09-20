import { AugmentList } from "@/components/set/AugmentList";
import { requireSetData } from "@/lib/set-data";

export const metadata = { title: "Augments" };

export default function AugmentsPage() {
  const data = requireSetData();
  const traits = data.traits.map((t) => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
  return <AugmentList augments={data.augments} traits={traits} />;
}
