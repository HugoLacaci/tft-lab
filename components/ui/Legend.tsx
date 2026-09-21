import Image from "next/image";
import type { ReactNode } from "react";
import { asset } from "@/lib/asset";

/**
 * A Little Legend as decoration: hex portrait in a gold (or tinted) ring with
 * a soft glow, floating. Art is mirrored from CommunityDragon into
 * public/assets/legends/<name>.webp (see README → Legal).
 */
export const LEGENDS = {
  "pengu-1": "Pengu Featherknight",
  "pengu-2": "Pengu Featherknight, 2 star",
  "pengu-3": "Pengu Featherknight, 3 star",
  "choncc-1": "Choncc",
  "choncc-2": "Choncc, 2 star",
  "choncc-3": "Choncc, 3 star",
  "choncc-wise": "Choncc the Wise",
  silverwing: "Silverwing",
  hauntling: "Hauntling",
  runespirit: "Runespirit",
  furyhorn: "Furyhorn",
  qiqi: "QiQi",
  ossia: "Ossia",
  bellswayer: "Bellswayer",
  poggles: "Poggles",
  squink: "Squink",
  craggle: "Craggle",
  dango: "Dango",
  gloop: "Gloop",
  duckbill: "Duckbill",
  protector: "Protector",
  flutterbug: "Flutterbug",
  paddlemar: "Paddlemar",
  fenroar: "Fenroar",
  burno: "Burno",
  nimblefoot: "Nimblefoot",
  molediver: "Molediver",
} as const;
export type LegendName = keyof typeof LEGENDS;

export function Legend({
  name,
  size = 140,
  tint,
  glow,
  float = true,
  delay = 0,
  className = "",
  title,
}: {
  name: LegendName;
  /** hex width in px */
  size?: number;
  /** ring colour (defaults to the gold trim) */
  tint?: string;
  /** glow colour */
  glow?: string;
  float?: boolean;
  /** seconds; offsets the float so several legends do not bob in sync */
  delay?: number;
  className?: string;
  /** Accessible name; omit to mark decorative. */
  title?: string;
}) {
  const style = {
    ["--legend-size" as string]: `${size}px`,
    ["--delay" as string]: `${delay}s`,
    ...(tint ? { ["--legend-ring" as string]: `linear-gradient(160deg, #fff, ${tint} 45%, color-mix(in srgb, ${tint} 45%, #000))` } : {}),
    ...(glow ? { ["--legend-glow" as string]: glow } : {}),
  } as React.CSSProperties;
  return (
    <span className={`legend ${float ? "float" : ""} ${className}`} style={style} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <span className="legend-glow" />
      <span className="legend-ring hex" />
      <span className="legend-art hex">
        <Image src={asset(`/assets/legends/${name}.webp`)} alt="" width={320} height={320} unoptimized draggable={false} />
      </span>
    </span>
  );
}

/** A legend with a speech bubble to its right. */
export function LegendSays({ name, size = 96, children, tint, glow, delay }: { name: LegendName; size?: number; children: ReactNode; tint?: string; glow?: string; delay?: number }) {
  return (
    <div className="flex items-center gap-4">
      <Legend name={name} size={size} tint={tint} glow={glow} delay={delay} />
      <div className="legend-bubble panel min-w-0 flex-1 px-4 py-3 text-sm text-dim">{children}</div>
    </div>
  );
}
