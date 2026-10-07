#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { docsJsonFor } from "../docgen.mjs";

/**
 * `bht-registry-docgen` — run from a component package's folder (its `build`
 * script does: `tsup && bht-registry-docgen`). Writes `docs.json`, the props
 * table react-docgen derives from the TypeScript, next to `package.json`.
 *
 * The file is listed in the package's `files`, so every published version
 * carries its own props documentation and a registry can render it without
 * the source tree or a TypeScript program of its own.
 */
const dir = process.cwd();
if (!fs.existsSync(path.join(dir, "package.json"))) {
  console.error("bht-registry-docgen: run this from a package folder (no package.json here).");
  process.exit(1);
}

const started = Date.now();
const out = docsJsonFor(dir);
fs.writeFileSync(path.join(dir, "docs.json"), `${JSON.stringify(out, null, 2)}\n`);
const props = out.docs.reduce((n, d) => n + d.props.length, 0);
console.log(`docs.json: ${out.docs.length} component(s), ${props} prop(s) — ${Date.now() - started}ms`);
