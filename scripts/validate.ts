/**
 * Build-time validation. Runs before `next build` (see package.json).
 * Fails the build (exit 1) on the first problem, naming the file and field.
 *
 * Checks (grow as the project grows):
 *   1. data/generated/current.json is well-formed.
 *   2. Every scenario in content/scenarios validates against the Zod schema.
 *   3. Every guideLink resolves to an existing guide + anchor.
 *   4. No hardcoded set numbers outside the allowed folders.
 */
import { runValidation } from "../lib/validate";

runValidation().then((problems) => {
  if (problems.length > 0) {
    console.error(`\n✖ ${problems.length} validation problem(s):\n`);
    for (const p of problems) console.error(`  ${p.file}${p.field ? ` › ${p.field}` : ""}: ${p.message}`);
    console.error("");
    process.exit(1);
  }
  console.log("✓ validation passed");
});
