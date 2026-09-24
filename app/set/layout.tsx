import Link from "next/link";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { hasSetContent, setDisplayName } from "@/lib/set-meta";
import { NewSetBanner } from "@/components/set/NewSetBanner";
import { SetSubnav } from "@/components/set/SetSubnav";
import { newsStamps } from "@/lib/whats-new-server";
import { livePatch } from "@/lib/live-patch";

export default function SetLayout({ children }: { children: React.ReactNode }) {
  if (!isSynced()) {
    return (
      <div className="panel p-6">
        <h1 className="text-2xl">No set data</h1>
        <p className="mt-2 text-dim">
          Run <code>npm run sync-set</code> to fetch the live set from CommunityDragon. The rest of the site works without it.
        </p>
      </div>
    );
  }
  const n = CURRENT_SET.setNumber;
  const name = setDisplayName(n, CURRENT_SET.setName);
  const hasProse = hasSetContent(n);
  const patch = livePatch();
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="display text-[0.7rem] uppercase tracking-[0.3em] text-gold">Live set</div>
          <h1 className="text-2xl sm:text-3xl">
            <Link href="/set" className="text-gold-bright hover:no-underline">
              Set {n} · {name}
            </Link>
          </h1>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dim" title={`Client build ${CURRENT_SET.patch} · ${CURRENT_SET.mutator}`}>
          <span className="set-badge-patch">Patch {patch.label}</span>
          {patch.publishedAt ? <span>notes {patch.publishedAt.slice(0, 10)}</span> : null}
          <span>· data synced {CURRENT_SET.syncedAt.slice(0, 10)}</span>
        </p>
      </div>
      {!hasProse ? <NewSetBanner setNumber={n} /> : null}
      <div className="subnav-sticky">
        <SetSubnav stamps={newsStamps()} />
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
