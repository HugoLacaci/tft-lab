/**
 * Primary navigation, in order. Comps first: it is what most visitors come
 * for, so it gets the accent in the header and the first slot in the bottom
 * bar on phones. Plain data (no "use client") so server and client parts share it.
 */
export interface NavItem {
  href: string;
  label: string;
  /** accented in the header */
  hot?: boolean;
  /** short label for the phone bottom bar; omitted = not in the bar */
  short?: string;
  /** shown inline only on very wide screens; otherwise lives in the menu sheet */
  secondary?: boolean;
  glyph?: "comps" | "set" | "trainer" | "lab" | "guides" | "tracker" | "routine" | "compete" | "resources";
}

export const NAV: readonly NavItem[] = [
  { href: "/set/comps", label: "Comps", hot: true, short: "Comps", glyph: "comps" },
  { href: "/set", label: "Set", short: "Set", glyph: "set" },
  { href: "/trainer", label: "Trainer", short: "Trainer", glyph: "trainer" },
  { href: "/lab", label: "Lab", short: "Lab", glyph: "lab" },
  { href: "/guides", label: "Guides", glyph: "guides" },
  { href: "/tracker", label: "Tracker", glyph: "tracker" },
  { href: "/routine", label: "Routine", glyph: "routine", secondary: true },
  { href: "/compete", label: "Compete", glyph: "compete", secondary: true },
  { href: "/resources", label: "Resources", glyph: "resources", secondary: true },
];

/** The item whose href is the longest prefix of the path, so /set/comps lights Comps, not Set. */
export function activeNavHref(pathname: string, items: readonly NavItem[] = NAV): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  let best: NavItem | null = null;
  for (const it of items) {
    if (clean === it.href || clean.startsWith(`${it.href}/`)) {
      if (!best || it.href.length > best.href.length) best = it;
    }
  }
  return best?.href ?? null;
}
