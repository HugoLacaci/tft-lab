import { AugmentList } from "@/components/set/AugmentList";
import { requireSetData } from "@/lib/set-data";
import { loadTiers, ranksById } from "@/lib/tiers";

export const metadata = { title: "Augments" };

export default function AugmentsPage() {
  const data = requireSetData();
  const traits = data.traits.map((t) => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
  const tiers = loadTiers();
  return (
    <div>
      {tiers ? <p className="mb-3 text-xs text-dim">Hex badges are the augment&apos;s strength this patch ({tiers.patch}, S best → F worst), curated on {tiers.verifiedOn}; no badge means unranked.</p> : null}
      <AugmentList augments={data.augments} traits={traits} ranks={ranksById(data.augments, tiers?.augments)} />
    </div>
  );
}
