import { loadSetData } from "@/lib/set-data";
import { SceneBackdrop, type SceneData } from "./Scenes";

/**
 * Fixed decorative layer behind the page: a drifting hex grid, three slow
 * colour glows, a handful of rising wisps, and a scene that depends on the
 * section being viewed (Scenes.tsx). Pure CSS (app/globals.css), aria-hidden,
 * no pointer events; prefers-reduced-motion freezes it.
 */
const WISPS: { x: number; s: number; d: number; delay: number; teal?: boolean }[] = [
  { x: 6, s: 5, d: 26, delay: 0 },
  { x: 14, s: 4, d: 31, delay: -9, teal: true },
  { x: 27, s: 7, d: 24, delay: -17 },
  { x: 41, s: 4, d: 29, delay: -4 },
  { x: 52, s: 6, d: 34, delay: -22, teal: true },
  { x: 63, s: 5, d: 27, delay: -13 },
  { x: 74, s: 4, d: 30, delay: -6 },
  { x: 83, s: 7, d: 25, delay: -19, teal: true },
  { x: 92, s: 5, d: 33, delay: -2 },
  { x: 97, s: 4, d: 28, delay: -11 },
];

/** A deterministic sample of the live set for the scenes: 15 champions spread over the costs, and every trait with an icon. */
function sceneData(): SceneData {
  const set = loadSetData();
  if (!set) return { champions: [], traits: [] };
  const champs = set.champions.filter((c) => c.icon && !/\(/.test(c.name)).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  const step = Math.max(1, Math.floor(champs.length / 15));
  const champions = champs.filter((_, i) => i % step === 0).slice(0, 15).map((c) => ({ name: c.name, icon: c.icon, cost: c.cost }));
  // shuffle deterministically so the shop does not show costs in order
  const order = [7, 0, 11, 3, 14, 5, 9, 1, 12, 6, 2, 13, 8, 4, 10];
  const shuffled = order.map((i) => champions[i]).filter((c): c is NonNullable<typeof c> => !!c);
  const traits = set.traits
    .filter((t) => t.icon)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ name: t.name, icon: t.icon }));
  return { champions: shuffled.length ? shuffled : champions, traits };
}

export function Backdrop() {
  return (
    <div className="backdrop no-print" aria-hidden>
      <div className="backdrop-hex" />
      <div className="backdrop-glow backdrop-glow-gold" />
      <div className="backdrop-glow backdrop-glow-teal" />
      <div className="backdrop-glow backdrop-glow-violet" />
      {WISPS.map((w, i) => (
        <span
          key={i}
          className={`wisp ${w.teal ? "wisp-teal" : ""}`}
          style={{ ["--x" as string]: `${w.x}%`, ["--s" as string]: `${w.s}px`, ["--d" as string]: `${w.d}s`, ["--delay" as string]: `${w.delay}s` } as React.CSSProperties}
        />
      ))}
      <SceneBackdrop data={sceneData()} />
    </div>
  );
}
