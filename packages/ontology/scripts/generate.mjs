// Generate TypeScript types from the JSON Schema. Run: npm run ontology
// Python (Pydantic) models: npm run ontology:py (needs datamodel-code-generator; see README).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";
import { OPTIONS } from "./options.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, "..", "schema", "game-state.schema.json");
const outPath = path.join(here, "..", "ts", "types.ts");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ts = await compile(schema, "GameState", OPTIONS);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, ts);
console.log(`✓ wrote ${path.relative(process.cwd(), outPath)} (${ts.split("\n").length} lines)`);
