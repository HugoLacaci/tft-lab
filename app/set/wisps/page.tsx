import Link from "next/link";
import { WispList, type WispData } from "@/components/set/CharmList";
import { requireSetData } from "@/lib/set-data";
import { baseWispName, loadWispInfo } from "@/lib/wisps";
import { loadTiers, rankLookup } from "@/lib/tiers";

export const metadata = { title: "Wisps" };

export default function WispsPage() {
  const data = requireSetData();
  const info = loadWispInfo();
  const tiers = loadTiers();
  const rankOf = rankLookup(tiers?.wisps ?? {});
  const raw = data.items.filter((i) => i.kind === "charm");
  const baseNames = new Set(raw.map((i) => baseWispName(i.name)));
  const wisps: WispData[] = raw.map((i) => {
    const w = info.lookup(i.name);
    return {
      id: i.id,
      name: i.name,
      desc: i.desc,
      rich: i.rich,
      icon: i.icon,
      effects: i.effects,
      cost: w?.cost ?? null,
      stage: w?.stage ?? null,
      rank: rankOf(i.name) ?? rankOf(baseWispName(i.name)),
      upgrade: /_Upgrade$/i.test(i.id) || (/\+$/.test(i.name) && baseNames.has(baseWispName(i.name)) && baseWispName(i.name) !== i.name),
    };
  });
  const known = wisps.filter((w) => !w.upgrade && w.cost !== null).length;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-dim">
        The set&apos;s main mechanic: one-shot effects that appear in the rightmost slot of every other shop, one purchase per round, priced by stage and stronger as the game goes on. See the <Link href="/set">overview</Link> for how they work. Effects and numbers come from
        the game files. Gold costs and appearance stages are not in the files;{" "}
        {info.syncedAt ? (
          <>
            they are read daily from{" "}
            <a href={info.source ?? "#"} target="_blank" rel="noreferrer">
              lolchess&apos;s public table
            </a>{" "}
            (last {info.syncedAt.slice(0, 10)})
          </>
        ) : (
          <>they come from published guides ({info.verifiedOn ?? "not verified"})</>
        )}
        . Tier badges are opinion from launch guides. Icons are the set&apos;s placeholder art on this patch.
      </p>
      <WispList wisps={wisps} known={known} />
    </div>
  );
}
