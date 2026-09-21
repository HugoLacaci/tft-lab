import Link from "next/link";

export const RIOT_DISCLAIMER =
  "TFT Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

export function Footer() {
  return (
    <footer className="no-print mt-12 border-t border-[var(--gold-dim)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-dim sm:px-6">
        <div className="gold-rule mb-4" />
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
          ; Little Legend art via CommunityDragon. Credits on <Link href="/resources">Resources</Link>.
        </p>
      </div>
    </footer>
  );
}
