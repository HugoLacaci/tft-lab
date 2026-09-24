import { StyleBadge, TraitIcon, UnitIcon } from "@/components/set/icons";
import { RichText } from "@/components/set/RichText";
import { loadSetData } from "@/lib/set-data";
import Link from "next/link";

/** Renders one trait's breakpoints from the synced data. `trait` may be an id or a display name. */
export function TraitBreakpoints({ trait, showUnits = true }: { trait: string; showUnits?: boolean }) {
  const data = loadSetData();
  const t = data?.traits.find((x) => x.id === trait || x.name.toLowerCase() === trait.toLowerCase());
  if (!data || !t) {
    return (
      <div className="panel my-4 p-3 text-sm text-dim">
        Trait <code>{trait}</code> is not in the current set.
      </div>
    );
  }
  const units = data.champions.filter((c) => c.traits.includes(t.id)).sort((a, b) => a.cost - b.cost);
  return (
    <div className="panel my-4 p-4">
      <div className="flex items-center gap-2">
        <TraitIcon icon={t.icon} name={t.name} size={22} />
        <Link href={`/set/traits#${t.id}`} className="display text-base text-gold-bright">
          {t.name}
        </Link>
      </div>
      {t.desc ? (
        <p className="mt-2 text-sm text-dim">
          <RichText text={t.desc} words />
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5 text-sm">
        {t.breakpoints.map((b) => (
          <li key={b.units} className="flex items-start gap-2">
            <StyleBadge style={b.style}>{b.units}</StyleBadge>
            <RichText text={b.desc.replace(/^\(\d+\)\s*/, "")} words />
          </li>
        ))}
      </ul>
      {showUnits && units.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {units.map((u) => (
            <Link key={u.id} href={`/set/champions/${u.id}`} title={u.name}>
              <UnitIcon icon={u.icon} name={u.name} cost={u.cost} size={32} />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
