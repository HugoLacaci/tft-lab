import Link from "next/link";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { PatchNotes } from "@/components/set/PatchNotes";
import { loadPatchNotes } from "@/lib/patch-notes";

export const metadata = { title: "Patch notes" };

export default function PatchNotesPage() {
  const data = loadPatchNotes();
  if (!data || data.notes.length === 0) {
    return (
      <Panel>
        <SectionTitle kicker="Patch notes">Not synced yet</SectionTitle>
        <p className="text-sm text-dim">
          Run <code>npm run sync-patch-notes</code> to pull the latest notes from{" "}
          <Link href="https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/">Riot&apos;s game updates</Link>. The daily sync workflow does this automatically.
        </p>
      </Panel>
    );
  }
  return <PatchNotes data={data} />;
}
