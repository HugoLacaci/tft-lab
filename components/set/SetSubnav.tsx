"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NewsStamps } from "@/lib/whats-new";
import { NewPill } from "@/components/ui/NewBadge";

const TABS: { href: string; label: string; news?: "comps" | "patch-notes" }[] = [
  { href: "/set", label: "Overview" },
  { href: "/set/champions", label: "Champions" },
  { href: "/set/traits", label: "Traits" },
  { href: "/set/items", label: "Items" },
  { href: "/set/augments", label: "Augments" },
  { href: "/set/wisps", label: "Wisps" },
  { href: "/set/comps", label: "Comps", news: "comps" },
  { href: "/set/patch-notes", label: "Patch notes", news: "patch-notes" },
];

export function SetSubnav({ stamps }: { stamps: NewsStamps }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Set sections" className="chip-scroll">
      {TABS.map((t) => {
        const active = t.href === "/set" ? pathname === "/set" || pathname === "/set/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`chip hover:no-underline ${active ? "chip-active" : ""}`} aria-current={active ? "page" : undefined}>
            {t.label}
            {t.news ? <NewPill area={t.news} stamps={stamps} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
