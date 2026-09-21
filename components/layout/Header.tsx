import Link from "next/link";
import { SetBadge } from "./SetBadge";
import { NavLinks } from "./NavLinks";
import { LogoMark } from "@/components/ui/Glyphs";

export const NAV = [
  { href: "/guides", label: "Guides" },
  { href: "/set", label: "Set" },
  { href: "/trainer", label: "Trainer" },
  { href: "/lab", label: "Lab" },
  { href: "/routine", label: "Routine" },
  { href: "/tracker", label: "Tracker" },
  { href: "/compete", label: "Compete" },
  { href: "/resources", label: "Resources" },
] as const;

export function Header() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-[var(--gold-dim)] bg-[color-mix(in_srgb,var(--bg-deep)_82%,transparent)] backdrop-blur">
      <div className="gold-rule gold-rule-shine absolute inset-x-0 bottom-0 opacity-40" aria-hidden />
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="display flex items-center gap-2 text-lg font-bold tracking-widest text-gold-bright hover:no-underline">
          <LogoMark />
          TFT LAB
        </Link>
        <SetBadge />
        <NavLinks items={NAV} />
      </div>
    </header>
  );
}
