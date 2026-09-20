"use client";

/**
 * Hand-built SVG charts for the tracker (single-series each, so one hue per
 * chart; identity is never colour-alone: every chart has direct labels or a
 * table view beneath it). Marks: bars ≤ 24px with a 4px rounded data-end,
 * 2px lines, ≥8px markers with a 2px surface ring, hairline gridlines.
 */
import { useId, useState } from "react";

const SURFACE = "var(--bg-panel)";
const MARK = "var(--teal)";
const MARK_MUTED = "#4f6b82";
const GRID = "rgba(200,170,110,0.15)";
const INK = "var(--text)";
const INK_DIM = "var(--text-dim)";

export function PlacementBars({ counts }: { counts: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const w = 360;
  const h = 160;
  const padL = 24;
  const padB = 24;
  const padT = 18;
  const slot = (w - padL) / 8;
  const bar = Math.min(24, slot - 8);
  const y = (v: number) => padT + (h - padT - padB) * (1 - v / max);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Placement distribution: ${counts.map((c, i) => `${i + 1}st ${c}`).join(", ")}`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={padL} x2={w} y1={y(max * t)} y2={y(max * t)} stroke={GRID} strokeWidth={1} />
        ))}
        {counts.map((c, i) => {
          const x = padL + i * slot + (slot - bar) / 2;
          const top = y(c);
          const hgt = h - padB - top;
          const fill = i < 4 ? MARK : MARK_MUTED;
          const on = hover === i;
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={h - padT - padB} fill="transparent" />
              {c > 0 ? (
                <path d={roundedTop(x, top, bar, hgt, 4)} fill={fill} opacity={on ? 1 : 0.9} stroke={on ? INK : "none"} strokeWidth={1} />
              ) : null}
              <text x={x + bar / 2} y={h - 8} textAnchor="middle" fontSize={11} fill={INK_DIM}>
                {i + 1}
              </text>
              {c > 0 ? (
                <text x={x + bar / 2} y={top - 4} textAnchor="middle" fontSize={10} fill={INK}>
                  {on && total ? `${Math.round((c / total) * 100)}%` : c}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-[0.7rem] text-dim">
        <span>
          <i className="mr-1 inline-block h-2 w-3 align-middle" style={{ background: MARK }} /> top 4
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-3 align-middle" style={{ background: MARK_MUTED }} /> bottom 4
        </span>
        <span className="ml-auto">hover a bar for the share</span>
      </figcaption>
    </figure>
  );
}

export function LeakBars({ rows }: { rows: { leak: string; count: number; label: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-1.5" role="img" aria-label={`Leak frequency: ${rows.map((r) => `${r.label} ${r.count}`).join(", ")}`}>
      {rows.map((r) => (
        <div key={r.leak} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-xs">
          <span className="truncate text-dim">{r.label}</span>
          <span className="relative h-3">
            <span className="absolute inset-y-0 left-0" style={{ width: `${(r.count / max) * 100}%`, background: MARK, borderRadius: "0 4px 4px 0", minWidth: 4 }} />
          </span>
          <span className="text-right tabular-nums text-ink">{r.count}</span>
        </div>
      ))}
      {rows.length === 0 ? <p className="text-xs text-dim">No leaks tagged yet.</p> : null}
    </div>
  );
}

export function RollingLine({ points }: { points: { index: number; avg: number }[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const w = 480;
  const h = 170;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : ((w - padL - padR) * i) / (n - 1));
  const y = (v: number) => padT + ((h - padT - padB) * (v - 1)) / 7; // placement 1 (top) … 8 (bottom)
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const area = n ? `${d} L${x(n - 1).toFixed(1)},${y(8)} L${x(0).toFixed(1)},${y(8)} Z` : "";
  const hi = hover ?? (n ? n - 1 : null);
  if (n === 0) return <p className="text-xs text-dim">Log a few games to see the trend.</p>;
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Rolling 20-game average placement, latest ${points[n - 1]!.avg.toFixed(2)}`}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * w;
          let best = 0;
          for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={MARK} stopOpacity={0.14} />
            <stop offset="1" stopColor={MARK} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[1, 4.5, 8].map((v) => (
          <g key={v}>
            <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill={INK_DIM}>
              {v}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={d} fill="none" stroke={MARK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hi !== null ? (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={h - padB} stroke={INK_DIM} strokeWidth={1} />
            <circle cx={x(hi)} cy={y(points[hi]!.avg)} r={6} fill={MARK} stroke={SURFACE} strokeWidth={2} />
            <text x={Math.min(x(hi) + 8, w - 60)} y={Math.max(y(points[hi]!.avg) - 8, 10)} fontSize={11} fill={INK}>
              <tspan fontWeight={600}>{points[hi]!.avg.toFixed(2)}</tspan>
              <tspan fill={INK_DIM}> · game {points[hi]!.index}</tspan>
            </text>
          </g>
        ) : null}
        <text x={padL} y={h - 6} fontSize={10} fill={INK_DIM}>
          game 1
        </text>
        <text x={w - padR} y={h - 6} textAnchor="end" fontSize={10} fill={INK_DIM}>
          game {n}
        </text>
      </svg>
      <figcaption className="mt-1 text-[0.7rem] text-dim">Lower is better. Each point is the mean of the previous 20 games (fewer at the start).</figcaption>
    </figure>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
