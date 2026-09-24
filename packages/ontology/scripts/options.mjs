// Shared by generate.mjs and tests/ontology.test.ts so the drift check compiles with identical options.
export const BANNER = [
  "/**",
  " * GENERATED from packages/ontology/schema/game-state.schema.json by packages/ontology/scripts/generate.mjs.",
  " * Do not edit by hand: change the schema and run `npm run ontology`.",
  " */",
].join("\n");
export const OPTIONS = {
  bannerComment: BANNER,
  additionalProperties: false,
  strictIndexSignatures: true,
  style: { printWidth: 160, singleQuote: false, semi: true, trailingComma: "all" },
};
