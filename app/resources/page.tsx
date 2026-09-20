import { PageTitle, Panel, SectionTitle } from "@/components/ui/Panel";
import { CREATORS } from "@/data/creators";

export const metadata = { title: "Resources" };

interface Res {
  name: string;
  url: string;
  use: string;
}

const GROUPS: { title: string; kicker: string; items: Res[] }[] = [
  {
    title: "Stats & meta",
    kicker: "Live data lives here, not on TFT Lab",
    items: [
      { name: "MetaTFT", url: "https://www.metatft.com/", use: "Comp shells, item priorities and augment stats with large samples; the in-game overlay if you want one." },
      { name: "tactics.tools", url: "https://tactics.tools/", use: "Unit and item win rates by rank bracket; the best place to check whether a comp works at your rank, not just at Challenger." },
      { name: "TFT Academy", url: "https://tftacademy.com/", use: "Curated comps by Dishsoap and Frodan with the reasoning attached; fewer comps, better explained." },
      { name: "Mobalytics TFT", url: "https://mobalytics.gg/tft", use: "Comp guides with positioning and early-game boards; good when you want a full walkthrough of one line." },
      { name: "op.gg TFT", url: "https://op.gg/tft", use: "Match history and per-player lookup; check your own recent games and the opponent you keep losing to." },
      { name: "Blitz", url: "https://blitz.gg/tft", use: "Overlay with comp suggestions during the game; use it for item pathing, not for what to play." },
    ],
  },
  {
    title: "Reference tables",
    kicker: "Numbers to verify ours against",
    items: [
      { name: "MetaTFT tables", url: "https://www.metatft.com/info", use: "Shop odds, pool sizes and XP tables kept current per patch." },
      { name: "Esports Tales pool & odds", url: "https://www.esportstales.com/teamfight-tactics/champion-pool-size-and-drop-chances", use: "Historic record of pool sizes and odds by set; the cross-check for data/constants." },
    ],
  },
  {
    title: "Official",
    kicker: "Riot",
    items: [
      { name: "TFT patch notes", url: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/", use: "Read before every session after a patch. The source for constants and verifiedOn dates." },
      { name: "TFT esports news", url: "https://teamfighttactics.leagueoflegends.com/en-us/news/esports/", use: "Trials, Regional Finals and Pro Circuit announcements with the real dates." },
      { name: "Riot developer portal — TFT", url: "https://developer.riotgames.com/docs/tft", use: "The API and Data Dragon docs; where our fallback data comes from." },
    ],
  },
  {
    title: "Competitive results & brackets",
    kicker: "Who won what",
    items: [{ name: "Liquipedia TFT", url: "https://liquipedia.net/tft/Main_Page", use: "Brackets, results and standings for every Cup and Regional Final." }],
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-10">
      <PageTitle lede="A curated directory with one line on what each thing is for. TFT Lab teaches; these are where the numbers and the comps live.">Resources</PageTitle>

      {GROUPS.map((g) => (
        <section key={g.title}>
          <SectionTitle kicker={g.kicker}>{g.title}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((r) => (
              <Panel key={r.name} as="article">
                <h3 className="text-base">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-gold-bright">
                    {r.name}
                  </a>
                </h3>
                <p className="mt-1 text-sm text-dim">
                  <span className="text-gold">Use it for:</span> {r.use}
                </p>
              </Panel>
            ))}
          </div>
        </section>
      ))}

      <section>
        <SectionTitle kicker="Watch and learn">Creators</SectionTitle>
        <p className="mb-3 text-sm text-dim">
          <span className="chip">teaching</span> channels talk through decisions; <span className="chip">high-level</span> channels play at the top and mostly do not narrate. Watch the second kind for the decisions, not the commentary.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CREATORS.map((c) => (
            <Panel key={c.name} as="article">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base">
                  <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-gold-bright">
                    {c.name}
                  </a>
                </h3>
                <span className="chip">{c.kind}</span>
                <span className="text-xs text-dim">{c.platform}</span>
              </div>
              <p className="mt-1 text-sm text-dim">{c.learn}</p>
              {!c.verifiedOn ? <p className="mt-1 text-[0.7rem] text-dim">Link not yet re-verified as active.</p> : null}
            </Panel>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle kicker="Reading stats without copying">How to actually use a stats site</SectionTitle>
        <Panel>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Use it to find <strong className="text-gold-bright">comp shells and item priorities</strong>: which units are the core, which items go on the carry first, what the tank wants.</li>
            <li>
              <strong className="text-gold-bright">Never copy a board hex-for-hex.</strong> The listed positioning is against nobody in particular; yours is against the seven boards in your lobby.
            </li>
            <li>
              A comp&apos;s average placement is the average of the players who <em>successfully hit it</em>. It is not your odds of hitting it from your seat, with your augments, against your contest. Two other players on the same page lower your number and not theirs.
            </li>
            <li>Look at the rank filter. A comp that is 4.2 at Challenger and 4.8 at Diamond is telling you it needs execution you may not have yet.</li>
          </ul>
        </Panel>
      </section>

      <section>
        <SectionTitle kicker="Credits">Data</SectionTitle>
        <Panel>
          <p className="text-sm text-dim">
            Champion, trait, item and augment data and icons are synced from{" "}
            <a href="https://communitydragon.org" target="_blank" rel="noopener noreferrer">
              CommunityDragon
            </a>{" "}
            (CDragon), with{" "}
            <a href="https://developer.riotgames.com/docs/lol#data-dragon" target="_blank" rel="noopener noreferrer">
              Riot Data Dragon
            </a>{" "}
            as the fallback. Thank you to the CommunityDragon maintainers. Fonts are Cinzel and Inter from Google Fonts; no Riot fonts are used. No third-party site content is scraped or reproduced.
          </p>
        </Panel>
      </section>
    </div>
  );
}
