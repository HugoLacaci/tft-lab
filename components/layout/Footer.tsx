import Link from "next/link";
import { LogoMark } from "@/components/ui/Glyphs";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { setDisplayName } from "@/lib/set-meta";
import { livePatch } from "@/lib/live-patch";

export const RIOT_DISCLAIMER =
  "TFT Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Live set",
    links: [
      { href: "/set/comps", label: "Comps tier list" },
      { href: "/set/champions", label: "Champions" },
      { href: "/set/traits", label: "Traits" },
      { href: "/set/items", label: "Items" },
      { href: "/set/augments", label: "Augments" },
      { href: "/set/wisps", label: "Wisps" },
      { href: "/set/patch-notes", label: "Patch notes" },
    ],
  },
  {
    title: "Improve",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/trainer", label: "Trainer" },
      { href: "/trainer/daily", label: "Daily 10" },
      { href: "/trainer/puzzles", label: "Puzzles" },
      { href: "/routine", label: "Routine" },
      { href: "/tracker", label: "Tracker" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/lab/board", label: "Team planner" },
      { href: "/lab/odds", label: "Roll odds" },
      { href: "/lab/econ", label: "Econ simulator" },
      { href: "/lab/cheatsheet", label: "Cheat sheet" },
      { href: "/compete", label: "Compete" },
      { href: "/resources", label: "Resources" },
    ],
  },
];

export function Footer() {
  const patch = livePatch();
  const synced = isSynced() ? new Date(CURRENT_SET.syncedAt) : null;
  const setName = isSynced() ? setDisplayName(CURRENT_SET.setNumber, CURRENT_SET.setName) : null;
  return (
    <footer className="site-footer no-print">
      <div className="site-footer-inner">
        <div className="gold-rule mb-8" />
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="display flex items-center gap-2 text-lg font-bold tracking-widest text-gold-bright hover:no-underline">
              <LogoMark />
              TFT LAB
            </Link>
            <p className="mt-3 max-w-xs text-sm text-dim">Comps, live set data, patch notes, drills and tools for Teamfight Tactics. Updated on its own every patch.</p>
            {synced ? (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-dim">
                <dt className="display uppercase tracking-[0.15em] text-gold">Set</dt>
                <dd>
                  {CURRENT_SET.setNumber} · {setName}
                </dd>
                <dt className="display uppercase tracking-[0.15em] text-gold">Patch</dt>
                <dd>
                  {patch.label}
                  {patch.publishedAt ? ` · notes ${patch.publishedAt.slice(0, 10)}` : ""}
                </dd>
                <dt className="display uppercase tracking-[0.15em] text-gold">Data</dt>
                <dd>
                  <time dateTime={synced.toISOString()}>{synced.toISOString().slice(0, 10)}</time> from CommunityDragon
                </dd>
              </dl>
            ) : null}
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <div className="display text-[0.68rem] uppercase tracking-[0.2em] text-gold">{c.title}</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-ink hover:text-gold-bright">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 border-t border-[var(--gold-dim)] pt-5 text-xs text-dim">
          <p className="max-w-3xl">{RIOT_DISCLAIMER}</p>
          <p className="mt-3">
            Game data via{" "}
            <a href="https://communitydragon.org" rel="noopener noreferrer" target="_blank">
              CommunityDragon
            </a>{" "}
            and{" "}
            <a href="https://developer.riotgames.com/docs/lol#data-dragon" rel="noopener noreferrer" target="_blank">
              Riot Data Dragon
            </a>
            ; patch notes mirrored from{" "}
            <a href="https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/" rel="noopener noreferrer" target="_blank">
              Riot&apos;s game updates
            </a>
            ; Little Legend art via CommunityDragon. Credits on <Link href="/resources">Resources</Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
