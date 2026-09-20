"use client";

import { useEffect, useState } from "react";
import { safeGet, safeSet } from "@/lib/storage";

export function NewSetBanner({ setNumber }: { setNumber: number }) {
  const key = `tftlab.banner.set-${setNumber}.dismissed`;
  // Rendered in the static HTML by default; hidden after hydration only if dismissed before.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (safeGet(key) === "1") setHidden(true);
  }, [key]);
  if (hidden) return null;
  return (
    <div role="status" className="panel mb-6 flex flex-wrap items-center gap-3 border-l-4 border-l-teal p-4">
      <p className="flex-1 text-sm">
        <strong className="text-gold-bright">Set {setNumber} just launched.</strong> The data below is live; the written guides are
        still being updated.
      </p>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          safeSet(key, "1");
          setHidden(true);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
