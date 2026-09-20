import Link from "next/link";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { hasSetContent, setDisplayName } from "@/lib/set-meta";
import { NewSetBanner } from "@/components/set/NewSetBanner";
import { SetSubnav } from "@/components/set/SetSubnav";

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
  return (
    <div>
      <div className="mb-6">
        <div className="display text-[0.7rem] uppercase tracking-[0.3em] text-gold">Live set</div>
        <h1 className="text-2xl sm:text-3xl">
          <Link href="/set" className="text-gold-bright hover:no-underline">
            Set {n} · {name}
          </Link>
        </h1>
        <p className="mt-1 text-xs text-dim">
          Patch {CURRENT_SET.patch} · synced {new Date(CURRENT_SET.syncedAt).toUTCString()} · {CURRENT_SET.mutator}
        </p>
        <div className="gold-rule mt-3 max-w-md" />
      </div>
      {!hasProse ? <NewSetBanner setNumber={n} /> : null}
      <SetSubnav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
