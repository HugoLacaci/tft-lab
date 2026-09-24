"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { activeNavHref, type NavItem } from "./nav";
import { Glyph, LogoMark } from "@/components/ui/Glyphs";
import { NewDot } from "@/components/ui/NewBadge";
import type { NewsStamps } from "@/lib/whats-new";
import { SearchPalette, openSearch } from "./SearchPalette";

const SET_LINKS: { href: string; label: string }[] = [
  { href: "/set/champions", label: "Champions" },
  { href: "/set/traits", label: "Traits" },
  { href: "/set/items", label: "Items" },
  { href: "/set/augments", label: "Augments" },
  { href: "/set/wisps", label: "Wisps" },
  { href: "/set/patch-notes", label: "Patch notes" },
];

/**
 * Header navigation: inline links from `lg` up, a full-screen sheet below
 * that (big tap targets, grouped), and the search trigger. Comps carries the
 * accent because it is the page most visitors come for.
 */
export function SiteNav({ items, stamps, patch }: { items: readonly NavItem[]; stamps: NewsStamps; patch: string }) {
  const pathname = usePathname();
  const active = activeNavHref(pathname, items);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <nav aria-label="Primary" className="site-nav">
        {items.map((it) => {
          const isActive = active === it.href;
          return (
            <Link key={it.href} href={it.href} aria-current={isActive ? "page" : undefined} className={`site-nav-link ${it.hot ? "site-nav-hot" : ""} ${it.secondary ? "site-nav-secondary" : ""} ${isActive ? "site-nav-active" : ""}`}>
              {it.hot ? <Glyph name="comps" size={14} /> : null}
              {it.label}
              {it.href === "/set/comps" ? <NewDot area="comps" stamps={stamps} className="absolute -right-2 -top-1" /> : null}
            </Link>
          );
        })}
      </nav>

      <button type="button" className="search-trigger" onClick={openSearch} aria-label="Search (Ctrl K)">
        <Glyph name="search" size={16} />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden md:inline">Ctrl K</kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className="menu-trigger" aria-label="Open menu">
          <Glyph name="menu" size={20} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay" />
          <Dialog.Content className="sheet" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Site menu</Dialog.Title>
            <div className="sheet-head">
              <Link href="/" className="display flex items-center gap-2 text-base font-bold tracking-widest text-gold-bright hover:no-underline" onClick={() => setOpen(false)}>
                <LogoMark />
                TFT LAB
              </Link>
              <span className="chip">Patch {patch}</span>
              <Dialog.Close className="menu-trigger ml-auto" aria-label="Close menu">
                <Glyph name="close" size={20} />
              </Dialog.Close>
            </div>
            <button
              type="button"
              className="sheet-search"
              onClick={() => {
                setOpen(false);
                setTimeout(openSearch, 50);
              }}
            >
              <Glyph name="search" size={18} />
              Search champions, items, augments, comps…
            </button>
            <ul className="sheet-grid">
              {items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className={`sheet-link ${it.hot ? "sheet-link-hot" : ""} ${active === it.href ? "sheet-link-active" : ""}`} onClick={() => setOpen(false)}>
                    {it.glyph ? <Glyph name={it.glyph} size={22} /> : null}
                    <span>{it.label}</span>
                    {it.href === "/set/comps" ? <NewDot area="comps" stamps={stamps} className="absolute right-3 top-3" /> : null}
                    {it.href === "/set" ? <NewDot area="patch-notes" stamps={stamps} className="absolute right-3 top-3" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="sheet-section">
              <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Live set</div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {SET_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="chip hover:no-underline" onClick={() => setOpen(false)}>
                      {l.label}
                      {l.href === "/set/patch-notes" ? <NewDot area="patch-notes" stamps={stamps} /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <SearchPalette />
    </>
  );
}
