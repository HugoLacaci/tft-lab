import Link from "next/link";
import { Session } from "@/components/trainer/Session";
import { loadScenarios } from "@/lib/scenarios";
import { buildSessionData } from "@/lib/trainer-server";

export const metadata = { title: "Daily 10" };

export default async function DailyPage() {
  const { data, rendered } = await buildSessionData(loadScenarios());
  return (
    <div>
      <div className="mb-6">
        <Link href="/trainer" className="text-xs">
          ← Trainer
        </Link>
        <h1 className="text-2xl sm:text-3xl">Daily 10</h1>
        <p className="mt-1 max-w-2xl text-sm text-dim">Due reviews first, then a mix weighted toward your weakest categories and the leaks you have logged in the tracker.</p>
      </div>
      <Session data={data} rendered={rendered} mode="daily" title="Daily 10" />
    </div>
  );
}
