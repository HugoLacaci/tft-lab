import Link from "next/link";
import { Session } from "@/components/trainer/Session";
import { loadScenarios } from "@/lib/scenarios";
import { buildSessionData } from "@/lib/trainer-server";

export const metadata = { title: "Replay missed drills", description: "Every drill whose last attempt was wrong, most recent first. Get it right once and it leaves the list." };

export default async function MissedPage() {
  const { data, rendered } = await buildSessionData(loadScenarios());
  return (
    <div>
      <div className="mb-6">
        <Link href="/trainer" className="text-xs">
          ← Trainer
        </Link>
        <h1 className="text-2xl sm:text-3xl">Replay what you missed</h1>
        <p className="mt-1 max-w-2xl text-sm text-dim">Drills whose last attempt was wrong, most recent first. Solve one and it leaves this list; the spaced schedule still brings it back in 1, 3 and 7 days so it sticks.</p>
      </div>
      <Session data={data} rendered={rendered} mode="missed" title="Replay" />
    </div>
  );
}
