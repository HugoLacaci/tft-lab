import Link from "next/link";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { setDisplayName } from "@/lib/set-meta";

/**
 * Header badge. Reads data/generated/current.json; never hardcode a set here.
 * Set name falls back to content/sets/<n>/meta.json when CDragon ships a
 * placeholder name (it does: Set 18 reports "Set10").
 */
export function SetBadge() {
  if (!isSynced()) {
    return (
      <span className="chip" title="Run npm run sync-set to fetch the live set">
        No set data
      </span>
    );
  }
  const name = setDisplayName(CURRENT_SET.setNumber, CURRENT_SET.setName);
  const synced = new Date(CURRENT_SET.syncedAt);
  return (
    <Link
      href="/set"
      className="chip chip-active hover:no-underline"
      title={`Synced ${synced.toUTCString()} · patch ${CURRENT_SET.patch} · ${CURRENT_SET.mutator}`}
    >
      <span className="text-gold">Set {CURRENT_SET.setNumber}</span>
      <span aria-hidden>·</span>
      <span>{name}</span>
    </Link>
  );
}
