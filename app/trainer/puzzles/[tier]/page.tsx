import Link from "next/link";
import { notFound } from "next/navigation";
import { Session } from "@/components/trainer/Session";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { RANK_TIERS, tierById } from "@/lib/rank-tiers";
import { puzzlesByTier } from "@/lib/puzzles";
import { buildSessionData } from "@/lib/trainer-server";

export function generateStaticParams() {
  return RANK_TIERS.map((t) => ({ tier: t.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params;
  return { title: `${tierById(tier)?.label ?? "Tactics"} puzzles` };
}

export default async function PuzzleTierPage({ params }: { params: Promise<{ tier: string }> }) {
  const { tier: id } = await params;
  const tier = tierById(id);
  if (!tier) notFound();
  const { data, rendered } = await buildSessionData(puzzlesByTier(tier.level));
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-4">
          <RankEmblem tier={tier} size={56} spin />
          <div>
            <Link href="/trainer/puzzles" className="text-xs">
              ← Tactics puzzles
            </Link>
            <h1 className="text-2xl sm:text-3xl" style={{ color: tier.color }}>
              {tier.label}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-dim">{tier.blurb}</p>
          </div>
        </div>
      </div>
      <Session data={data} rendered={rendered} mode="puzzles" title={`${tier.short} puzzles`} />
    </div>
  );
}
