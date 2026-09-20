import Link from "next/link";
import { PageTitle, Panel, SectionTitle } from "@/components/ui/Panel";

export const metadata = { title: "Routine" };

export default function RoutinePage() {
  return (
    <div className="space-y-10">
      <PageTitle lede="A concrete weekly plan. Not “play more”: a fixed shape for each session, one review method that fits in twenty minutes, and the rules that stop tilt from costing you the LP you earned.">
        Study routine
      </PageTitle>

      <section>
        <SectionTitle kicker="Every session">Before you queue</SectionTitle>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            <strong className="text-gold-bright">Read the patch notes</strong> if there has been a patch since your last session. Not the community summary: the notes. Note the three changes most likely to touch what you play.
          </li>
          <li>
            <strong className="text-gold-bright">Check the current top comps on a stats site</strong> (<Link href="/resources">which one, and how to read it</Link>). You are looking for shells and item priorities, not boards to copy.
          </li>
          <li>
            <strong className="text-gold-bright">Pick one leak to watch for.</strong> One. Take it from your <Link href="/tracker">tracker</Link>&apos;s weakest category. Say it out loud: “this session I am not rolling below 50 without a reason.”
          </li>
        </ol>
      </section>

      <section>
        <SectionTitle kicker="Session shape">Three to five games, then stop</SectionTitle>
        <Panel>
          <p className="text-sm">
            A sitting is 3–5 games. After the fifth, stop regardless of result. Decision quality drops before you notice it does, and the games after that are the ones you cannot explain in review. Tilt costs more LP than any single misplay, and it costs it silently.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-dim">
            <li>Log every game in the tracker before queueing the next one: placement, comp, one leak tag, one line.</li>
            <li>Stop at −3 games in a row, even inside the five. Three bad results in a row is a sample about you, not the lobby.</li>
            <li>Do not play a new patch&apos;s first day expecting LP. Play it to learn what changed, log it as such, and do not count it.</li>
          </ul>
        </Panel>
      </section>

      <section>
        <SectionTitle kicker="Review">The VOD method: one round per game</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <h3 className="text-base">Which games</h3>
            <p className="mt-2 text-sm text-dim">
              The ones you placed 5th–8th in. Wins teach you what you already know. A bottom-four game has a round where it was decided, and that round is what you are looking for.
            </p>
          </Panel>
          <Panel>
            <h3 className="text-base">What you do</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-dim">
              <li>Scrub to the round you think decided the game. It is usually earlier than you remember: a 3-2 augment, a 4-1 level, an item slam you delayed.</li>
              <li>Write down the decision you made and the single alternative you rejected.</li>
              <li>Write which one was right, in one sentence, and why. If you cannot say why, that is the guide you read next.</li>
            </ol>
            <p className="mt-2 text-sm text-dim">One round per game. Not a full rewatch. Five minutes, then close it.</p>
          </Panel>
        </div>
      </section>

      <section>
        <SectionTitle kicker="Weekly">Twenty minutes of drills, one pro VOD</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <h3 className="text-base">Trainer</h3>
            <p className="mt-2 text-sm text-dim">
              Twenty minutes in your weakest category, once a week. The <Link href="/trainer">Daily 10</Link> weights toward it automatically and brings back what you missed after 1, 3 and 7 days. The point is not the score. It is that the decision becomes boring.
            </p>
          </Panel>
          <Panel>
            <h3 className="text-base">One pro VOD</h3>
            <p className="mt-2 text-sm text-dim">
              Pick a comp you already play and a player who plays it well (<Link href="/resources">creators</Link>). Watch one game. Note only the decisions that differ from what you would have done: the level timing, the slam, the pivot. Ignore the rest. Three notes is a good week.
            </p>
          </Panel>
        </div>
      </section>

      <section>
        <SectionTitle kicker="Ladder hygiene">Rules you set before you are tilted</SectionTitle>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Stop playing at −3 games in a row.</li>
          <li>Five games maximum per sitting; a break of at least an hour between sittings.</li>
          <li>No ranked on patch day. Normals, or a stats site and the notes.</li>
          <li>Log before you queue. If it is not logged, it is not reviewed, and if it is not reviewed you will do it again.</li>
          <li>Weekly: look at the tracker&apos;s 20-game average. If it is not moving after four weeks on the same leak, the leak is not the problem; ask a better player to watch one game.</li>
        </ul>
      </section>
    </div>
  );
}
