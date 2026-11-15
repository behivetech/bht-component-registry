#!/usr/bin/env node
// Fails when a `.module.scss` breaks the SCSS shape in scripts/lib/scss-conventions.mjs:
// modifiers nested the one way, and one component per file.
//
//   node scripts/check-scss-conventions.mjs                 every .module.scss in the repo
//   node scripts/check-scss-conventions.mjs a.scss b.scss   only these (lint-staged)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkScss } from "./lib/scss-conventions.mjs";
import { ALLOWED_USES, selectStylesheets } from "./lib/scss-files.mjs";

const root = resolve(import.meta.dirname, "..");

// Tracked files and new ones not yet added, so a stylesheet is checked before
// its first commit too.
const listAll = () =>
  execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "*.module.scss"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);

const files = selectStylesheets({
  root,
  given: process.argv.slice(2),
  listAll,
});
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
let count = 0;

for (const file of files) {
  const problems = checkScss(readFileSync(resolve(root, file), "utf8"), {
    allowedUses: ALLOWED_USES[file] ?? [],
  });

  for (const problem of problems) {
    count += 1;
    console.error(
      `${file}:${problem.line}  ${problem.rule}  ${problem.message}`,
    );
  }
}

if (count > 0) {
  console.error(
    `\n${plural(count, "SCSS convention problem")}. The shape is in apps/docs/default-docs/guide/components.md ("Modifiers in the stylesheet", "One stylesheet per component").`,
  );
  process.exit(1);
}

console.log(`SCSS conventions: ${plural(files.length, "file")} OK`);
