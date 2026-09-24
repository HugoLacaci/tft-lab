"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavHref, NAV } from "./nav";
import { Glyph } from "@/components/ui/Glyphs";
import { openSearch } from "./SearchPalette";

/**
 * Phone bottom bar (hidden from `lg` up and on short landscape screens, see
 * globals.css): the four destinations that matter on a phone plus search.
 * Sits above the home-indicator safe area.
 */
export function BottomNav() {
  const pathname = usePathname();
  const active = activeNavHref(pathname);
  const items = NAV.filter((n) => n.short);
  return (
    <nav className="bottom-nav no-print" aria-label="Quick navigation">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`bottom-nav-item ${active === it.href ? "bottom-nav-active" : ""} ${it.hot ? "bottom-nav-hot" : ""}`} aria-current={active === it.href ? "page" : undefined}>
          {it.glyph ? <Glyph name={it.glyph} size={20} /> : null}
          <span>{it.short}</span>
        </Link>
      ))}
      <button type="button" className="bottom-nav-item" onClick={openSearch}>
        <Glyph name="search" size={20} />
        <span>Search</span>
      </button>
    </nav>
  );
}
