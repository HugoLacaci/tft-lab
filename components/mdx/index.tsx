import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Callout } from "./Callout";
import { OddsTable, PoolTable, InterestTable, LevelTable } from "./Tables";
import { ItemCombineMatrix } from "./ItemCombineMatrix";
import { TraitBreakpoints } from "./TraitBreakpoints";
import { BoardExample } from "./BoardExample";
import { DrillThis, CheckYourself } from "./Drill";
import { StatChip, StatIcon, StatWords } from "@/components/set/StatIcon";
import type { StatKey } from "@/lib/stat-meta";

/**
 * Components available inside any MDX file (guides and set prose).
 * Keep this list in sync with the guide authoring notes in README.
 */
export const mdxComponents: MDXComponents = {
  a: ({ href = "", children, ...rest }) =>
    href.startsWith("/") ? (
      <Link href={href} {...rest}>
        {children}
      </Link>
    ) : (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    ),
  table: (props) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
  Callout,
  OddsTable,
  PoolTable,
  InterestTable,
  LevelTable,
  ItemCombineMatrix,
  TraitBreakpoints,
  BoardExample,
  DrillThis,
  CheckYourself,
  /** `<Stat k="AD" />` — icon + short label; `label` overrides the text, `icon` shows only the glyph. */
  Stat: ({ k, label, icon }: { k: StatKey; label?: string; icon?: boolean }) => (icon ? <StatIcon stat={k} /> : <StatChip stat={k} label={label} />),
  /** `<StatWords text="…" />` — prose with an icon before every stat word. */
  StatWords,
};
