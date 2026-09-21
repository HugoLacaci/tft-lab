"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { asset } from "@/lib/asset";
import { costColor } from "@/lib/costs";
import { COLS, ROWS, boardSize, displayCoord, hexOffset } from "@/lib/hex";
import { Legend, type LegendName } from "@/components/ui/Legend";

/**
 * Section backdrops. One animated scene per part of the site, picked from the
 * pathname and cross-faded on navigation (the wrapper remounts on scene change):
 *
 *   /            lobby     Little Legends walking an orbit, hopping, gold rising
 *   /set         shop      a reroll loop: champion cards slide in, pause, slide out
 *   /trainer     battle    a tilted board: units charge, trade blows, HP bars drain
 *   /lab         workshop  hextech gears turning, bubbles rising, a scan line
 *   everything else  study a mandala of trait icons in counter-rotating rings
 *
 * All motion is CSS keyframes (app/globals.css → .scene-*), deterministic,
 * aria-hidden and frozen under prefers-reduced-motion.
 */
export interface SceneData {
  champions: { name: string; icon: string; cost: number }[];
  traits: { name: string; icon: string }[];
}

type SceneId = "lobby" | "shop" | "battle" | "workshop" | "study";

export function sceneFor(pathname: string): SceneId {
  if (pathname === "/" || pathname === "") return "lobby";
  if (pathname.startsWith("/set")) return "shop";
  if (pathname.startsWith("/trainer")) return "battle";
  if (pathname.startsWith("/lab")) return "workshop";
  return "study";
}

export function SceneBackdrop({ data }: { data: SceneData }) {
  const scene = sceneFor(usePathname() ?? "/");
  return (
    <div key={scene} className={`scene scene-${scene}`} aria-hidden data-scene={scene}>
      {scene === "lobby" ? <Lobby /> : null}
      {scene === "shop" ? <Shop champions={data.champions} /> : null}
      {scene === "battle" ? <Battle /> : null}
      {scene === "workshop" ? <Workshop /> : null}
      {scene === "study" ? <Study traits={data.traits} /> : null}
    </div>
  );
}

/* ───────────────────────────── lobby ───────────────────────────── */
const WALKERS: { name: LegendName; delay: number; size: number; tint?: string; glow?: string }[] = [
  { name: "pengu-2", delay: 0, size: 78 },
  { name: "choncc-1", delay: -10, size: 88, tint: "#0ac8b9", glow: "rgba(10,200,185,0.45)" },
  { name: "poggles", delay: -20, size: 70, tint: "#c68cff", glow: "rgba(198,140,255,0.45)" },
  { name: "silverwing", delay: -30, size: 74, tint: "#ffb642", glow: "rgba(255,182,66,0.45)" },
];
const COINS = [4, 11, 19, 27, 36, 47, 55, 63, 72, 81, 90, 96];

function Lobby() {
  return (
    <>
      <div className="lobby-ring">
        <svg viewBox="0 0 1600 800" className="lobby-path">
          <path d="M 800 120 C 1300 120 1500 420 1200 560 C 900 700 300 700 150 500 C 0 360 300 120 800 120 Z" fill="none" stroke="#c8aa6e" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="6 12" />
          <ellipse cx="800" cy="410" rx="330" ry="150" fill="none" stroke="#0ac8b9" strokeOpacity="0.2" strokeWidth="1" />
        </svg>
        {WALKERS.map((w) => (
          <span key={w.name} className="lobby-walker" style={{ ["--delay" as string]: `${w.delay}s` } as React.CSSProperties}>
            <span className="lobby-hop" style={{ ["--delay" as string]: `${w.delay * 0.37}s` } as React.CSSProperties}>
              <Legend name={w.name} size={w.size} float={false} tint={w.tint} glow={w.glow} />
            </span>
            <span className="lobby-shadow" />
          </span>
        ))}
      </div>
      {COINS.map((x, i) => (
        <span key={i} className="coin" style={{ ["--x" as string]: `${x}%`, ["--delay" as string]: `${(i * 1.7) % 9}s`, ["--d" as string]: `${9 + (i % 4) * 2}s` } as React.CSSProperties}>
          <span className="coin-face">g</span>
        </span>
      ))}
    </>
  );
}

/* ───────────────────────────── shop ───────────────────────────── */
/** Two shop columns in the side gutters: cards rise like an endless reroll, one column per direction. */
function Shop({ champions }: { champions: SceneData["champions"] }) {
  if (!champions.length) return null;
  const column = (list: SceneData["champions"], side: "left" | "right", dur: number) => {
    const doubled = [...list, ...list]; // seamless loop: the track is twice the list, animated by half its height
    return (
      <div className={`shop shop-${side}`} style={{ ["--d" as string]: `${dur}s` } as React.CSSProperties}>
        <div className="shop-track">
          {doubled.map((c, i) => (
            <span key={i} className="shop-card" style={{ ["--ring" as string]: costColor(c.cost as 1 | 2 | 3 | 4 | 5), ["--delay" as string]: `${(i * 0.9) % 5}s` } as React.CSSProperties}>
              <span className="shop-art">
                <Image src={asset(c.icon)} alt="" width={96} height={96} unoptimized draggable={false} />
              </span>
              <span className="shop-name">{c.name}</span>
              <span className="shop-cost">
                <span className="coin-face">g</span> {c.cost}
              </span>
            </span>
          ))}
        </div>
        <span className="shop-label">{side === "left" ? "Shop · reroll 2g" : "Pool"}</span>
      </div>
    );
  };
  const half = Math.ceil(champions.length / 2);
  return (
    <>
      {column(champions.slice(0, half), "left", 75)}
      {column(champions.slice(half).concat(champions.slice(0, Math.max(0, half - (champions.length - half)))), "right", 90)}
    </>
  );
}

/* ───────────────────────────── battle ───────────────────────────── */
const HEX = 44;
const HEX_H = HEX * 1.1547;
type Side = "own" | "enemy";
interface Fighter {
  side: Side;
  row: number;
  col: number;
  cost: number;
  /** hexes forward it charges (positive = toward the divider) */
  charge: number;
  delay: number;
  ranged?: boolean;
}
const FIGHTERS: Fighter[] = [
  { side: "own", row: 0, col: 2, cost: 3, charge: 1, delay: 0 },
  { side: "own", row: 0, col: 3, cost: 4, charge: 1, delay: 0.3 },
  { side: "own", row: 0, col: 4, cost: 2, charge: 1, delay: 0.5 },
  { side: "own", row: 1, col: 1, cost: 3, charge: 2, delay: 0.9 },
  { side: "own", row: 1, col: 5, cost: 3, charge: 2, delay: 1.1 },
  { side: "own", row: 3, col: 1, cost: 4, charge: 0, delay: 0, ranged: true },
  { side: "own", row: 3, col: 3, cost: 5, charge: 0, delay: 0.4, ranged: true },
  { side: "own", row: 3, col: 5, cost: 4, charge: 0, delay: 0.8, ranged: true },
  { side: "enemy", row: 0, col: 2, cost: 4, charge: 1, delay: 0.2 },
  { side: "enemy", row: 0, col: 3, cost: 3, charge: 1, delay: 0.6 },
  { side: "enemy", row: 0, col: 4, cost: 5, charge: 1, delay: 0.4 },
  { side: "enemy", row: 1, col: 2, cost: 2, charge: 2, delay: 1.3 },
  { side: "enemy", row: 3, col: 1, cost: 4, charge: 0, delay: 0.1, ranged: true },
  { side: "enemy", row: 3, col: 4, cost: 3, charge: 0, delay: 0.7, ranged: true },
  { side: "enemy", row: 3, col: 6, cost: 5, charge: 0, delay: 1, ranged: true },
];
const COST_COLOR: Record<number, string> = { 1: "#9aa4b0", 2: "#1bc47d", 3: "#2f7fdc", 4: "#c440e0", 5: "#ffb642" };

function center(side: Side, row: number, col: number) {
  const { drow, dcol } = displayCoord(side, { row, col }, "versus");
  const off = hexOffset(drow, dcol);
  return { x: (off.x + 0.5) * HEX, y: off.y * HEX + HEX_H / 2 };
}
function hexPoints(cx: number, cy: number, w: number) {
  const r = (w / 2) * 1.1547;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Two fights, one in each gutter, offset in time so something is always happening. */
function Battle() {
  return (
    <>
      <div className="battle battle-left">
        <BattleBoard id="bl" offset={0} />
      </div>
      <div className="battle battle-right">
        <BattleBoard id="br" offset={3.7} />
      </div>
    </>
  );
}

function BattleBoard({ id, offset }: { id: string; offset: number }) {
  const size = boardSize(ROWS * 2);
  const w = size.w * HEX;
  const h = size.h * HEX;
  const cells: { side: Side; row: number; col: number }[] = [];
  for (const side of ["enemy", "own"] as Side[]) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ side, row: r, col: c });
  const ranged = FIGHTERS.filter((f) => f.ranged);
  const melee = (side: Side) => FIGHTERS.filter((f) => f.side === side && !f.ranged);
  return (
    <div style={{ ["--offset" as string]: `${offset}s` } as React.CSSProperties}>
      <svg viewBox={`-30 -30 ${w + 60} ${h + 60}`} className="battle-board">
        <defs>
          <radialGradient id={`${id}-burst`}>
            <stop offset="0" stopColor="#fff7dd" stopOpacity="1" />
            <stop offset="0.45" stopColor="#ffb642" stopOpacity="0.55" />
            <stop offset="1" stopColor="#e0483a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-cast`}>
            <stop offset="0" stopColor="#e2fffb" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0ac8b9" stopOpacity="0" />
          </radialGradient>
        </defs>
        {cells.map(({ side, row, col }, i) => {
          const c = center(side, row, col);
          return <polygon key={i} points={hexPoints(c.x, c.y, HEX * 0.94)} className={`battle-hex ${side === "enemy" ? "battle-hex-enemy" : ""}`} />;
        })}
        <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="#c8aa6e" strokeOpacity="0.5" strokeWidth="1" />
        {/* arrows and spells from the backlines */}
        {ranged.map((s, i) => {
          const from = center(s.side, s.row, s.col);
          const pool = melee(s.side === "own" ? "enemy" : "own");
          const tg = pool[i % pool.length]!;
          const to = center(tg.side, tg.row, tg.col);
          const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 40 };
          return (
            <g key={`shot-${i}`}>
              <path d={`M ${from.x} ${from.y} Q ${mid.x} ${mid.y} ${to.x} ${to.y}`} fill="none" stroke={s.side === "own" ? "#0ac8b9" : "#ff8a5c"} strokeWidth="2" strokeLinecap="round" className="battle-shot" style={{ ["--delay" as string]: `${s.delay}s`, ["--d" as string]: `${1.6 + (i % 3) * 0.4}s` } as React.CSSProperties} />
              <circle cx={to.x} cy={to.y} r={HEX * 0.7} fill={`url(#${id}-burst)`} className="battle-hit" style={{ ["--delay" as string]: `${s.delay + 0.9}s`, ["--d" as string]: `${1.6 + (i % 3) * 0.4}s` } as React.CSSProperties} />
            </g>
          );
        })}
        {/* big casts at the clash line */}
        {[2, 4].map((col, i) => {
          const c = center("own", 0, col);
          return <circle key={`cast-${i}`} cx={c.x} cy={c.y - HEX_H * 0.4} r={HEX * 1.4} fill={`url(#${id}-cast)`} className="battle-cast" style={{ ["--delay" as string]: `${3 + i * 4.5}s` } as React.CSSProperties} />;
        })}
        {FIGHTERS.map((f, i) => {
          const c = center(f.side, f.row, f.col);
          const dir = f.side === "own" ? -1 : 1;
          const dy = f.charge * HEX_H * 0.75 * dir;
          return (
            <g key={`f-${i}`} className={f.charge ? "battle-charger" : "battle-stander"} style={{ ["--dy" as string]: `${dy.toFixed(1)}px`, ["--dx" as string]: `${(f.charge % 2 ? HEX / 2 : 0) * (f.col > 3 ? -1 : 1)}px`, ["--delay" as string]: `${f.delay}s` } as React.CSSProperties}>
              <circle cx={c.x} cy={c.y} r={HEX * 0.46} fill={COST_COLOR[f.cost]} opacity="0.35" />
              <polygon points={hexPoints(c.x, c.y, HEX * 0.56)} fill={f.side === "own" ? "#0e1520" : "#1a0f12"} stroke={COST_COLOR[f.cost]} strokeWidth="1.8" />
              <circle cx={c.x} cy={c.y} r={HEX * 0.12} fill={COST_COLOR[f.cost]} />
              {/* HP bar */}
              <rect x={c.x - HEX * 0.32} y={c.y - HEX * 0.5} width={HEX * 0.64} height={4} fill="#000" opacity="0.6" />
              <rect x={c.x - HEX * 0.32} y={c.y - HEX * 0.5} width={HEX * 0.64} height={4} fill={f.side === "own" ? "#1bc47d" : "#e0483a"} className="battle-hp" style={{ ["--delay" as string]: `${f.delay + 1.5}s` } as React.CSSProperties} />
              {/* mana bar */}
              <rect x={c.x - HEX * 0.32} y={c.y - HEX * 0.5 + 5} width={HEX * 0.64} height={2} fill="#2f7fdc" className="battle-mana" style={{ ["--delay" as string]: `${f.delay}s` } as React.CSSProperties} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ───────────────────────────── workshop ───────────────────────────── */
function gearPath(cx: number, cy: number, r: number, teeth: number, depth: number) {
  const pts: string[] = [];
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const phase = i % 4;
    const rr = phase === 0 || phase === 3 ? r : r + depth;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}
const GEARS = [
  { cx: 200, cy: 220, r: 110, teeth: 14, dur: 36, rev: false },
  { cx: 380, cy: 330, r: 70, teeth: 9, dur: 23, rev: true },
  { cx: 120, cy: 420, r: 60, teeth: 8, dur: 20, rev: true },
  { cx: 1400, cy: 260, r: 120, teeth: 16, dur: 40, rev: true },
  { cx: 1250, cy: 420, r: 62, teeth: 8, dur: 21, rev: false },
];
const BUBBLES = [8, 15, 23, 31, 42, 58, 67, 76, 84, 93];

function Workshop() {
  return (
    <>
      <svg viewBox="0 0 1600 700" className="workshop-gears">
        {GEARS.map((g, i) => (
          <g key={i} className={`gear ${g.rev ? "gear-rev" : ""}`} style={{ ["--d" as string]: `${g.dur}s`, transformOrigin: `${g.cx}px ${g.cy}px` } as React.CSSProperties}>
            <path d={gearPath(g.cx, g.cy, g.r, g.teeth, 16)} fill="rgba(200,170,110,0.05)" stroke="#c8aa6e" strokeOpacity="0.55" strokeWidth="1.4" />
            <polygon points={hexPoints(g.cx, g.cy, g.r * 0.9)} fill="none" stroke="#0ac8b9" strokeOpacity="0.45" strokeWidth="1" />
            <circle cx={g.cx} cy={g.cy} r={g.r * 0.22} fill="none" stroke="#c8aa6e" strokeOpacity="0.7" strokeWidth="1.2" />
            {[0, 60, 120].map((deg) => (
              <line key={deg} x1={g.cx + g.r * 0.25 * Math.cos((deg * Math.PI) / 180)} y1={g.cy + g.r * 0.25 * Math.sin((deg * Math.PI) / 180)} x2={g.cx - g.r * 0.25 * Math.cos((deg * Math.PI) / 180)} y2={g.cy - g.r * 0.25 * Math.sin((deg * Math.PI) / 180)} stroke="#c8aa6e" strokeOpacity="0.4" />
            ))}
          </g>
        ))}
      </svg>
      {BUBBLES.map((x, i) => (
        <span key={i} className="bubble" style={{ ["--x" as string]: `${x}%`, ["--delay" as string]: `${(i * 1.3) % 7}s`, ["--d" as string]: `${7 + (i % 3) * 2}s`, ["--s" as string]: `${8 + (i % 4) * 4}px` } as React.CSSProperties} />
      ))}
      <span className="scanline" />
    </>
  );
}

/* ───────────────────────────── study ───────────────────────────── */
const MOTES = [5, 12, 20, 29, 37, 44, 52, 61, 69, 77, 86, 94];

/** Two trait mandalas, one per gutter, each with its own share of the set's traits. */
function Study({ traits }: { traits: SceneData["traits"] }) {
  const ring = (list: SceneData["traits"], r: number, cls: string) =>
    list.map((t, i) => {
      const a = (i / list.length) * 2 * Math.PI - Math.PI / 2;
      return (
        <span key={t.name} className={`mandala-icon ${cls}`} style={{ left: `calc(50% + ${(Math.cos(a) * r).toFixed(1)}px)`, top: `calc(50% + ${(Math.sin(a) * r).toFixed(1)}px)`, ["--delay" as string]: `${i * 0.3}s` } as React.CSSProperties}>
          <Image src={asset(t.icon)} alt="" width={28} height={28} unoptimized draggable={false} />
        </span>
      );
    });
  const mandala = (outer: SceneData["traits"], inner: SceneData["traits"], side: "left" | "right") => (
    <div className={`mandala mandala-${side}`}>
      <svg viewBox="-260 -260 520 520" className="mandala-lines">
        <circle r="230" fill="none" stroke="#c8aa6e" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 10" />
        <circle r="150" fill="none" stroke="#0ac8b9" strokeOpacity="0.25" strokeWidth="1" />
        <polygon points="0,-110 95,-55 95,55 0,110 -95,55 -95,-55" fill="none" stroke="#c8aa6e" strokeOpacity="0.4" strokeWidth="1" />
        <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="rgba(200,170,110,0.06)" stroke="#c8aa6e" strokeOpacity="0.6" strokeWidth="1" />
      </svg>
      <div className="mandala-ring mandala-outer">{ring(outer, 230, "mandala-icon-outer")}</div>
      <div className="mandala-ring mandala-inner">{ring(inner, 150, "mandala-icon-inner")}</div>
    </div>
  );
  const half = Math.ceil(traits.length / 2);
  const a = traits.slice(0, half);
  const b = traits.slice(half);
  return (
    <>
      {mandala(a.slice(0, 10), a.slice(10, 16), "left")}
      {mandala(b.slice(0, 10), b.slice(10, 16), "right")}
      {MOTES.map((x, i) => (
        <span key={i} className="mote" style={{ ["--x" as string]: `${x}%`, ["--delay" as string]: `${(i * 2.1) % 12}s`, ["--d" as string]: `${14 + (i % 5) * 3}s` } as React.CSSProperties} />
      ))}
    </>
  );
}
