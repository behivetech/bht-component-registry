import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `pnpm release` runs this right before `changeset publish`, and again with
 * `--restore` right after.
 *
 * A package's description lives in one place: the first paragraph of its
 * README, which the docs site shows on the catalog card. npm shows
 * `package.json#description` in search results and package lists, so the
 * published package should carry the same sentence — but a copy in
 * package.json would be a second place to edit and let drift. So this writes
 * that paragraph into each registry package's package.json in the working
 * tree for the publish, and `--restore` puts the files back. Nothing is
 * committed; the repo keeps one copy.
 *
 * The paragraph rule is the one in apps/docs/src/lib/catalog/parse.ts
 * (readmeSummary): the first paragraph after the H1 that is not a heading,
 * list, table, comment, code block or the `Docs:` line, joined onto one line.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const restore = process.argv.includes("--restore");

function registryPackages() {
  const registry = join(ROOT, "registry");
  if (!existsSync(registry)) return [];
  const result = [];
  for (const scope of readdirSync(registry, { withFileTypes: true })) {
    if (!scope.isDirectory() || scope.name.startsWith(".")) continue;
    for (const category of readdirSync(join(registry, scope.name), { withFileTypes: true })) {
      if (!category.isDirectory() || category.name.startsWith(".")) continue;
      for (const name of readdirSync(join(registry, scope.name, category.name), { withFileTypes: true })) {
        const dir = join(registry, scope.name, category.name, name.name);
        if (name.isDirectory() && existsSync(join(dir, "package.json"))) result.push(dir);
      }
    }
  }
  return result;
}

export function readmeSummary(readme) {
  const paragraphs = readme
    .replace(/^#\s+.*\r?\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !p.startsWith("#") &&
        !p.startsWith("<!--") &&
        !p.startsWith("|") &&
        !p.startsWith("-") &&
        !/^Docs:\s/.test(p),
    );
  return paragraphs[0]?.replace(/\s+/g, " ") ?? "";
}

const files = registryPackages().map((dir) => join(dir, "package.json"));
// What the last run wrote, with each file's original text, so --restore puts
// back exactly what was there — whatever else the working tree holds.
const stateFile = join(ROOT, "node_modules", ".inject-descriptions.json");

if (restore) {
  const originals = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
  for (const [file, text] of Object.entries(originals)) writeFileSync(file, text);
  if (existsSync(stateFile)) rmSync(stateFile);
  console.log(`inject-descriptions: restored ${Object.keys(originals).length} package.json file(s)`);
} else {
  const originals = {};
  for (const file of files) {
    const readmeFile = join(dirname(file), "README.md");
    if (!existsSync(readmeFile)) continue;
    const summary = readmeSummary(readFileSync(readmeFile, "utf8"));
    if (!summary || summary.startsWith("TODO")) continue;
    const text = readFileSync(file, "utf8");
    const pkg = JSON.parse(text);
    if (pkg.description === summary) continue;
    // Keep the key where the template puts it (after "license") when it is new.
    const entries = Object.entries(pkg).filter(([key]) => key !== "description");
    const at = entries.findIndex(([key]) => key === "license");
    entries.splice(at === -1 ? 2 : at + 1, 0, ["description", summary]);
    originals[file] = text;
    writeFileSync(file, JSON.stringify(Object.fromEntries(entries), null, 2) + "\n");
  }
  writeFileSync(stateFile, JSON.stringify(originals));
  console.log(`inject-descriptions: wrote ${Object.keys(originals).length} description(s) from README summaries (working tree only)`);
}
