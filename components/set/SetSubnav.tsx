"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/set", label: "Overview" },
  { href: "/set/champions", label: "Champions" },
  { href: "/set/traits", label: "Traits" },
  { href: "/set/items", label: "Items" },
  { href: "/set/augments", label: "Augments" },
  { href: "/set/wisps", label: "Wisps" },
  { href: "/set/comps", label: "Comps" },
  { href: "/set/patch-notes", label: "Patch notes" },
];

export function SetSubnav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Set sections" className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = t.href === "/set" ? pathname === "/set" || pathname === "/set/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`chip hover:no-underline ${active ? "chip-active" : ""}`} aria-current={active ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
