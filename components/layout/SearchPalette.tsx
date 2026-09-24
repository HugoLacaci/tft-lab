"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { costColor } from "@/lib/costs";
import { groupResults, searchIndex, KIND_LABEL, type SearchRecord } from "@/lib/search";
import { Glyph } from "@/components/ui/Glyphs";

/** Fired by any component (bottom bar, hero) that wants the palette open. */
export const OPEN_SEARCH_EVENT = "tftlab:search";
export function openSearch(): void {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
  } catch {
    /* ignore */
  }
}

const QUICK: SearchRecord[] = [
  { k: "page", n: "Comps tier list", h: "/set/comps/", s: "Current patch" },
  { k: "page", n: "Patch notes", h: "/set/patch-notes/", s: "What changed" },
  { k: "page", n: "Champions", h: "/set/champions/", s: "Roster" },
  { k: "page", n: "Items", h: "/set/items/", s: "Recipes and tiers" },
  { k: "page", n: "Augments", h: "/set/augments/", s: "Tiers" },
  { k: "page", n: "Team planner", h: "/lab/board/", s: "Build a board" },
  { k: "page", n: "Daily 10", h: "/trainer/daily/", s: "Today's drills" },
];

let cache: SearchRecord[] | null = null;
let pending: Promise<SearchRecord[]> | null = null;
function loadIndex(): Promise<SearchRecord[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch(asset("/search-index.json"))
      .then((r) => (r.ok ? (r.json() as Promise<SearchRecord[]>) : []))
      .then((list) => (cache = list))
      .catch(() => (cache = []));
  }
  return pending;
}

/**
 * Site-wide search: Ctrl/⌘ K, the header button, or the phone bottom bar.
 * Champions, traits, items, augments, wisps, comps, guides and pages, from a
 * static index fetched once. Arrow keys move, Enter opens, Esc closes.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchRecord[] | null>(cache);
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open && !index) void loadIndex().then(setIndex);
    if (!open) {
      setQ("");
      setSel(0);
    }
  }, [open, index]);

  const results = useMemo(() => (q.trim() ? searchIndex(index ?? [], q) : QUICK), [index, q]);
  const groups = useMemo(() => groupResults(results), [results]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const go = useCallback(
    (r: SearchRecord) => {
      setOpen(false);
      router.push(r.h);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(flat.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      const r = flat[sel];
      if (r) {
        e.preventDefault();
        go(r);
      }
    }
  };

  let idx = -1;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay" />
        <Dialog.Content className="search-dialog" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <Dialog.Title className="sr-only">Search TFT Lab</Dialog.Title>
          <div className="search-head">
            <Glyph name="search" size={18} className="text-gold" />
            <input
              autoFocus
              className="search-input"
              placeholder="Search champions, items, augments, comps, guides…"
              aria-label="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            <Dialog.Close className="search-close" aria-label="Close search">
              <kbd>Esc</kbd>
            </Dialog.Close>
          </div>
          <div className="search-body" ref={listRef} role="listbox" aria-label="Results">
            {q.trim() && index === null ? <p className="search-empty">Loading the index…</p> : null}
            {q.trim() && index !== null && flat.length === 0 ? <p className="search-empty">Nothing matches “{q}”.</p> : null}
            {groups.map((g) => (
              <section key={g.kind} className="search-group">
                <h3 className="search-group-title">{q.trim() ? KIND_LABEL[g.kind] : "Quick links"}</h3>
                <ul>
                  {g.items.map((r) => {
                    idx += 1;
                    const i = idx;
                    return (
                      <li key={`${r.k}-${r.h}-${r.n}`}>
                        <Link
                          href={r.h}
                          data-idx={i}
                          role="option"
                          aria-selected={i === sel}
                          className={`search-row ${i === sel ? "search-row-active" : ""}`}
                          onMouseEnter={() => setSel(i)}
                          onClick={() => setOpen(false)}
                        >
                          <span className="search-icon" style={r.k === "champion" && r.c ? { background: costColor(r.c) } : undefined}>
                            {r.i ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset(r.i)} alt="" loading="lazy" />
                            ) : (
                              <Glyph name={r.k === "comp" ? "comps" : r.k === "guide" ? "guides" : "arrow"} size={14} />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-gold-bright">{r.n}</span>
                            {r.s ? <span className="block truncate text-[0.68rem] capitalize text-dim">{r.s}</span> : null}
                          </span>
                          <span className="search-kind">{KIND_LABEL[r.k].replace(/s$/, "")}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="search-foot">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> move
            </span>
            <span>
              <kbd>↵</kbd> open
            </span>
            <span>
              <kbd>/</kbd> or <kbd>Ctrl K</kbd> anywhere
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
