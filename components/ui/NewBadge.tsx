"use client";

import { useUnseen, type NewsArea, type NewsStamps } from "@/lib/whats-new";

/** Pulsing dot: something in `area` changed since this browser last opened it. */
export function NewDot({ area, stamps, className = "" }: { area: NewsArea | "any"; stamps: NewsStamps; className?: string }) {
  const unseen = useUnseen(stamps);
  const on = area === "any" ? unseen["patch-notes"] || unseen.comps : unseen[area];
  if (!on) return null;
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`} aria-label="New since your last visit" role="img">
      <span className="pulse-ring absolute inset-0 rounded-full bg-teal" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-teal shadow-[0_0_6px_var(--teal)]" />
    </span>
  );
}

/** Small NEW pill for nav chips and cards. */
export function NewPill({ area, stamps, className = "" }: { area: NewsArea; stamps: NewsStamps; className?: string }) {
  const unseen = useUnseen(stamps);
  if (!unseen[area]) return null;
  return (
    <span className={`display pop inline-flex items-center gap-1 border border-teal px-1 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-teal ${className}`} aria-label="New since your last visit">
      <span className="h-1 w-1 rounded-full bg-teal" />
      New
    </span>
  );
}
