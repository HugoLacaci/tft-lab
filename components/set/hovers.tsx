"use client";

/**
 * In-game style hover cards. `Hover` opens after ~1s of hovering (or on
 * focus), like the client tooltips; the card bodies are shared by the set hub
 * and the team planner pickers.
 */
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import type { Champion, Item, Trait } from "@/lib/types";
import { classifyTags, TAG_COLOR, TAG_LABEL, type Tag } from "@/lib/tags";
import { ItemIcon, TraitIcon, UnitIcon } from "./icons";
import { RichText } from "./RichText";
import { StatChip, StatIcon } from "./StatIcon";
import { RankBadge } from "./RankBadge";
import type { Rank } from "@/lib/tiers";
import { STATS, type StatKey } from "@/lib/stat-meta";

export function Hover({ children, content, delay = 1000, side = "right" }: { children: ReactNode; content: ReactNode; delay?: number; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Tooltip.Provider delayDuration={delay} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side={side} sideOffset={8} collisionPadding={12} className="panel z-50 w-[22rem] max-w-[calc(100vw-2rem)] p-3 text-xs shadow-2xl">
            {content}
            <Tooltip.Arrow className="fill-[var(--gold-dim)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export type ChampionCardData = Pick<Champion, "id" | "name" | "cost" | "icon" | "traits" | "stats" | "ability">;

export function ChampionCard({ c, traits }: { c: ChampionCardData; traits: Record<string, Pick<Trait, "id" | "name" | "icon">> }) {
  const s = c.stats;
  const scales = [c.ability.scaling.ad ? "AD" : null, c.ability.scaling.ap ? "AP" : null].filter(Boolean) as StatKey[];
  return (
    <div>
      <div className="flex items-center gap-2">
        <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={40} />
        <div className="min-w-0">
          <div className="display text-sm text-gold-bright">{c.name}</div>
          <div className="flex flex-wrap gap-x-2 text-[0.68rem] text-gold">
            {c.traits.map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <TraitIcon icon={traits[t]?.icon ?? ""} name={traits[t]?.name ?? t} size={11} />
                {traits[t]?.name ?? t}
              </span>
            ))}
          </div>
        </div>
        <span className="display ml-auto inline-flex items-center gap-1 text-[0.7rem] font-bold" style={{ color: `var(--cost-${c.cost})` }}>
          {c.cost}
          <StatIcon stat="Gold" size="0.95em" />
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-x-2 gap-y-0.5 border-y border-[var(--gold-dim)] py-1.5 text-[0.65rem] tabular-nums">
        <Stat k="HP" v={s.hp} />
        <Stat k="AD" v={s.ad} />
        <Stat k="AS" v={s.attackSpeed.toFixed(2)} />
        <Stat k="Range" v={s.range} />
        <Stat k="Armor" v={s.armor} />
        <Stat k="MR" v={s.mr} />
        <Stat k="Mana" v={`${s.initialMana}/${s.mana}`} />
        <Stat k="Crit" v={`${Math.round(s.critChance * 100)}%`} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="display text-[0.72rem] text-gold-bright">{c.ability.name || "Ability"}</span>
        {scales.length ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[0.62rem] text-dim">
            scales with{" "}
            {scales.map((x) => (
              <StatChip key={x} stat={x} />
            ))}
          </span>
        ) : null}
      </div>
      <p className="mt-1 leading-relaxed text-ink">
        <RichText text={c.ability.rich || c.ability.desc || "No ability text in the synced data."} words />
      </p>
    </div>
  );
}

/** One row of the stat bar: icon + short label on the left, value on the right. */
function Stat({ k, v }: { k: StatKey; v: number | string }) {
  return (
    <span className="flex items-center justify-between gap-1">
      <span className="inline-flex items-center gap-1 text-dim">
        <StatIcon stat={k} />
        {STATS[k].label}
      </span>
      <span className="text-gold-bright">{v}</span>
    </span>
  );
}

/** Stat line for items: icon, value and the short label ("⚔ +10% AD"). */
export function StatValue({ stat, value, className = "" }: { stat: StatKey; value: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <StatIcon stat={stat} />
      <span className="tabular-nums text-gold-bright">{value}</span>
      <span className="text-[0.85em] text-dim">{STATS[stat].label}</span>
    </span>
  );
}

export type ItemCardData = Pick<Item, "id" | "name" | "icon" | "kind" | "desc" | "rich" | "effects" | "composition" | "associatedTraits">;
export type ItemRef = Pick<Item, "id" | "name" | "icon">;

const KIND_LABEL: Record<Item["kind"], string> = {
  component: "Component",
  completed: "Completed item",
  emblem: "Emblem",
  artifact: "Artifact",
  radiant: "Radiant",
  support: "Support",
  charm: "Wisp",
  other: "Other",
};

/** Effect keys `itemStats` understands; the rest are item-specific numbers. */
export const STAT_EFFECT_KEYS = new Set([
  "AD",
  "AD_NotStatBar",
  "AP",
  "AP_NotStatBar",
  "AS",
  "Health",
  "PercentMaxHP",
  "BonusPercentHP",
  "Armor",
  "MagicResist",
  "CritChance",
  "ManaRegen",
  "Mana",
  "StatOmnivamp",
  "StatOmnivamp_NotStatBar",
  "LifeSteal",
  "DamageAmp",
  "BonusDamage",
  "BaseDurability",
]);

export function itemStats(e: Record<string, number>): { k: StatKey; v: string }[] {
  const out: { k: StatKey; v: string }[] = [];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  if (e.AD) out.push({ k: "AD", v: `+${pct(e.AD)}` });
  if (e.AD_NotStatBar) out.push({ k: "AD", v: `+${pct(e.AD_NotStatBar)}` });
  if (e.AP) out.push({ k: "AP", v: `+${e.AP}` });
  if (e.AP_NotStatBar) out.push({ k: "AP", v: `+${e.AP_NotStatBar}` });
  if (e.AS) out.push({ k: "AS", v: `+${e.AS}%` });
  if (e.Health) out.push({ k: "HP", v: `+${e.Health}` });
  if (e.PercentMaxHP) out.push({ k: "HP", v: `+${pct(e.PercentMaxHP)}` });
  if (e.BonusPercentHP) out.push({ k: "HP", v: `+${pct(e.BonusPercentHP)}` });
  if (e.Armor) out.push({ k: "Armor", v: `+${e.Armor}` });
  if (e.MagicResist) out.push({ k: "MR", v: `+${e.MagicResist}` });
  if (e.CritChance) out.push({ k: "Crit", v: `+${e.CritChance > 1 ? e.CritChance : e.CritChance * 100}%` });
  if (e.ManaRegen) out.push({ k: "Mana regen", v: `+${e.ManaRegen}` });
  if (e.Mana) out.push({ k: "Mana", v: `+${e.Mana}` });
  if (e.StatOmnivamp) out.push({ k: "Omnivamp", v: `+${e.StatOmnivamp > 1 ? e.StatOmnivamp : e.StatOmnivamp * 100}%` });
  if (e.StatOmnivamp_NotStatBar) out.push({ k: "Omnivamp", v: `+${pct(e.StatOmnivamp_NotStatBar)}` });
  if (e.LifeSteal) out.push({ k: "Lifesteal", v: `+${e.LifeSteal > 1 ? e.LifeSteal : e.LifeSteal * 100}%` });
  if (e.DamageAmp) out.push({ k: "Dmg amp", v: `+${pct(e.DamageAmp)}` });
  if (e.BonusDamage) out.push({ k: "Dmg amp", v: `+${pct(e.BonusDamage)}` });
  if (e.BaseDurability) out.push({ k: "Durability", v: `+${pct(e.BaseDurability)}` });
  return out;
}

export function ItemCard({ i, components, traits, rank, stat }: { i: ItemCardData; components: Record<string, ItemRef>; traits?: Record<string, Pick<Trait, "id" | "name" | "icon">>; rank?: Rank; stat?: { avg: number; games: number; patch: string } }) {
  const stats = itemStats(i.effects);
  const recipe = i.composition.map((c) => components[c] ?? { id: c, name: c, icon: "" });
  return (
    <div>
      <div className="flex items-center gap-2">
        <ItemIcon icon={i.icon} name={i.name} size={40} />
        <div className="min-w-0">
          <div className="display text-sm text-gold-bright">{i.name}</div>
          <div className="text-[0.65rem] uppercase tracking-wider text-dim">{KIND_LABEL[i.kind]}</div>
        </div>
        {rank ? (
          <span className="ml-auto flex flex-col items-center text-[0.6rem] text-dim">
            <RankBadge rank={rank} size={22} />
            <span>tier</span>
          </span>
        ) : null}
      </div>
      {stat ? (
        <div className="mt-1 text-[0.65rem] text-dim">
          Avg placement <span className="text-gold-bright">{stat.avg.toFixed(2)}</span> over {stat.games} top-ladder boards (patch {stat.patch})
        </div>
      ) : null}
      {stats.length ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-y border-[var(--gold-dim)] py-1.5 text-[0.68rem]">
          {stats.map((s, idx) => (
            <StatValue key={idx} stat={s.k} value={s.v} />
          ))}
        </div>
      ) : null}
      {i.kind === "emblem" && i.associatedTraits.length > 0 && traits ? (
        <div className="mt-2 text-[0.7rem] text-gold">
          Grants{" "}
          {i.associatedTraits.map((t) => (
            <span key={t} className="inline-flex items-center gap-1">
              <TraitIcon icon={traits[t]?.icon ?? ""} name={traits[t]?.name ?? t} size={11} />
              {traits[t]?.name ?? t}
            </span>
          ))}
        </div>
      ) : null}
      {i.rich || i.desc ? (
        <p className="mt-2 leading-relaxed text-ink">
          <RichText text={i.rich || i.desc} words />
        </p>
      ) : null}
      {recipe.length ? (
        <div className="mt-2 flex items-center gap-2 border-t border-[var(--gold-dim)] pt-2 text-[0.68rem] text-dim">
          <span className="display uppercase tracking-wider">Recipe</span>
          {recipe.map((r, idx) => (
            <span key={idx} className="inline-flex items-center gap-1">
              {idx > 0 ? <span aria-hidden>+</span> : null}
              <ItemIcon icon={r.icon} name={r.name} size={22} />
              <span className="text-ink">{r.name}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TagChips({ tags, size = "sm" }: { tags: Tag[]; size?: "sm" | "xs" }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className={`display inline-flex items-center px-1.5 uppercase tracking-wider ${size === "xs" ? "text-[0.55rem] leading-4" : "text-[0.62rem] leading-5"}`} style={{ color: TAG_COLOR[t], border: `1px solid ${TAG_COLOR[t]}88`, background: `${TAG_COLOR[t]}14` }}>
          {TAG_LABEL[t]}
        </span>
      ))}
    </span>
  );
}

export function tagsFor(x: { name: string; desc: string; associatedTraits?: string[] }): Tag[] {
  return classifyTags(x.name, x.desc, x.associatedTraits ?? []);
}
