"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function NavLinks({ items }: { items: ReadonlyArray<{ href: string; label: string }> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-sm ml-auto md:hidden"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        Menu
      </button>
      <nav
        id="site-nav"
        aria-label="Primary"
        className={`${open ? "flex" : "hidden"} w-full flex-col gap-1 md:ml-auto md:flex md:w-auto md:flex-row md:gap-4`}
      >
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`display px-1 py-1 text-[0.78rem] uppercase tracking-[0.12em] hover:no-underline ${
                active ? "text-gold border-b border-gold" : "text-dim hover:text-gold-bright"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
