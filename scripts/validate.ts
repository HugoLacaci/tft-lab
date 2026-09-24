/**
 * Build-time validation. Runs before `next build` (see package.json).
 *
 * Problems come in two severities:
 *   - error: generated data malformed, scenario schema broken, dead guide
 *     links, hardcoded set numbers, MDX that does not compile. Exit 1.
 *   - warning: hand-curated set content (comps, tiers, wisp costs) naming an
 *     id or name the synced set no longer has. Printed, exit 0: the pages
 *     degrade gracefully (unknown ids are skipped) and the DATA must still
 *     ship when Riot renames an augment mid-set. Pass --strict (authoring,
 *     CI on content changes) to make warnings fatal too.
 *
 * Checks (grow as the project grows):
 *   1. data/generated/current.json is well-formed.
 *   2. Every scenario in content/scenarios validates against the Zod schema.
 *   3. Every guideLink resolves to an existing guide + anchor.
 *   4. No hardcoded set numbers outside the allowed folders.
 *   5. Curated set content references real ids/names (warning).
 */
import { runValidation } from "../lib/validate";

const strict = process.argv.includes("--strict");

runValidation().then((problems) => {
  const errors = problems.filter((p) => p.severity !== "warning");
  const warnings = problems.filter((p) => p.severity === "warning");
  const print = (list: typeof problems) => {
    for (const p of list) console.error(`  ${p.file}${p.field ? ` › ${p.field}` : ""}: ${p.message}`);
  };
  if (warnings.length) {
    console.error(`\n⚠ ${warnings.length} curated-content warning(s)${strict ? " (fatal with --strict)" : ""}:\n`);
    print(warnings);
    console.error("");
  }
  if (errors.length) {
    console.error(`\n✖ ${errors.length} validation problem(s):\n`);
    print(errors);
    console.error("");
  }
  if (errors.length || (strict && warnings.length)) process.exit(1);
  console.log(warnings.length ? `✓ validation passed with ${warnings.length} warning(s)` : "✓ validation passed");
});
