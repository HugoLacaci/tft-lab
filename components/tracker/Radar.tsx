"use client";

/**
 * Single-series radar for the eight play dimensions (0–100). One hue (teal),
 * direct labels on every axis, a hover tooltip per vertex, and the scores
 * table sits beside it so identity is never colour-alone.
 */
import { useState } from "react";

const MARK = "var(--teal)";
const GRID = "rgba(200,170,110,0.18)";
const INK = "var(--text)";
const INK_DIM = "var(--text-dim)";

export function Radar({ axes }: { axes: { id: string; label: string; score: number; note: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = axes.length;
  const w = 340;
  const h = 300;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const r = 105;
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, v: number) => ({ x: cx + Math.cos(angle(i)) * r * (v / 100), y: cy + Math.sin(angle(i)) * r * (v / 100) });
  const ring = (v: number) =>
    axes
      .map((_, i) => pt(i, v))
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";
  const data =
    axes
      .map((a, i) => pt(i, a.score))
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-auto w-full max-w-[22rem]" role="img" aria-label={`Play profile: ${axes.map((a) => `${a.label} ${a.score}`).join(", ")}`}>
        {[25, 50, 75, 100].map((v) => (
          <path key={v} d={ring(v)} fill="none" stroke={GRID} strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const p = pt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={GRID} strokeWidth={1} />;
        })}
        <path d={data} fill={MARK} fillOpacity={0.18} stroke={MARK} strokeWidth={2} strokeLinejoin="round" />
        {axes.map((a, i) => {
          const p = pt(i, a.score);
          const lp = pt(i, 128);
          const on = hover === i;
          const anchor = Math.abs(Math.cos(angle(i))) < 0.2 ? "middle" : Math.cos(angle(i)) > 0 ? "start" : "end";
          return (
            <g key={a.id} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
              <circle cx={p.x} cy={p.y} r={on ? 6 : 4} fill={MARK} stroke="var(--bg-panel)" strokeWidth={2} />
              <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
              <text x={lp.x} y={lp.y + 4} textAnchor={anchor} fontSize={10.5} fill={on ? INK : INK_DIM}>
                {a.label}
              </text>
              <text x={lp.x} y={lp.y + 15} textAnchor={anchor} fontSize={10} fill={INK} fontWeight={600}>
                {a.score}
              </text>
            </g>
          );
        })}
        {hover !== null ? (
          <g>
            <rect x={cx - 110} y={h - 24} width={220} height={20} fill="var(--bg-raised)" stroke={GRID} />
            <text x={cx} y={h - 10} textAnchor="middle" fontSize={10} fill={INK}>
              {axes[hover]!.label}: {axes[hover]!.note}
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-dim">0 = the leak decides your games · 100 = never the problem · hover an axis for the number behind it</figcaption>
    </figure>
  );
}
