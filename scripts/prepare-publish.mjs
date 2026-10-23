import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `pnpm release` runs this right before `changeset publish`, and again with
 * `--restore` right after. It fills in what a published package should say
 * about itself from the two places that information already lives, so nothing
 * is written twice in git:
 *
 * - `package.json#description` ← the README's first paragraph (the same
 *   sentence the docs site shows on the catalog card).
 * - `package.json#homepage` and a `Docs: <url>` line under that paragraph in
 *   the README ← `registry.config.json#site.url` plus the package's path, so
 *   the npm page links to the package's docs page rather than the repository
 *   (which may be private). Skipped when `site.url` is not set.
 *
 * The files are changed in the working tree for the publish only; `--restore`
 * writes back the originals saved in node_modules/.prepare-publish.json, so the
 * restore is exact whatever else the working tree holds.
 *
 * The paragraph rule is the one in apps/docs/src/lib/catalog/parse.ts
 * (readmeSummary): the first paragraph after the H1 that is not a heading,
 * list, table, comment or code block, joined onto one line.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const restore = process.argv.includes("--restore");
const stateFile = join(ROOT, "node_modules", ".prepare-publish.json");

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

const isProse = (p) =>
  p && !p.startsWith("#") && !p.startsWith("<!--") && !p.startsWith("|") && !p.startsWith("-") && !/^Docs:\s/.test(p);

export function readmeSummary(readme) {
  const paragraphs = readme
    .replace(/^#\s+.*\r?\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(isProse);
  return paragraphs[0]?.replace(/\s+/g, " ") ?? "";
}

/** The README with `Docs: <url>` as its own paragraph after the summary. */
export function withDocsLine(readme, url) {
  if (/^Docs:\s/m.test(readme)) return readme;
  const parts = readme.split(/(\n\s*\n)/);
  let inCode = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\n\s*\n$/.test(part)) continue;
    const fences = (part.match(/```/g) ?? []).length;
    if (inCode) { if (fences % 2) inCode = false; continue; }
    if (fences % 2) { inCode = true; continue; }
    const text = part.trim();
    if (!text || text.startsWith("#") || !isProse(text) || text.startsWith("```")) continue;
    parts.splice(i + 1, 0, `\n\nDocs: ${url}`);
    return parts.join("");
  }
  return readme;
}

/** The docs page for registry/<scope>/<category>/<name> under site.url, or null. */
function docsUrl(dir) {
  const config = JSON.parse(readFileSync(join(ROOT, "registry.config.json"), "utf8"));
  const base = config.site?.url?.replace(/\/+$/, "");
  if (!base) return null;
  const rel = relative(join(ROOT, "registry"), dir).split("\\").join("/");
  return `${base}/${rel}`;
}

if (restore) {
  const originals = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
  for (const [file, text] of Object.entries(originals)) writeFileSync(file, text);
  if (existsSync(stateFile)) rmSync(stateFile);
  console.log(`prepare-publish: restored ${Object.keys(originals).length} file(s)`);
} else {
  const originals = {};
  const save = (file, text) => { if (!(file in originals)) originals[file] = text; };
  let packages = 0;
  for (const dir of registryPackages()) {
    const pkgFile = join(dir, "package.json");
    const readmeFile = join(dir, "README.md");
    const readme = existsSync(readmeFile) ? readFileSync(readmeFile, "utf8") : "";
    const summary = readmeSummary(readme);
    const url = docsUrl(dir);
    const text = readFileSync(pkgFile, "utf8");
    const pkg = JSON.parse(text);
    if (pkg.private) continue; // workspace-only, never published
    const next = { ...pkg };
    if (summary && !summary.startsWith("TODO")) next.description = summary;
    if (url) next.homepage = url;
    if (JSON.stringify(next) !== JSON.stringify(pkg)) {
      // Keep the keys where the template puts them: description after license, homepage after repository.
      const entries = Object.entries(pkg).filter(([key]) => key !== "description" && key !== "homepage");
      const place = (key, after) => {
        if (!(key in next)) return;
        const at = entries.findIndex(([k]) => k === after);
        entries.splice(at === -1 ? entries.length : at + 1, 0, [key, next[key]]);
      };
      place("description", "license");
      place("homepage", "repository");
      save(pkgFile, text);
      writeFileSync(pkgFile, JSON.stringify(Object.fromEntries(entries), null, 2) + "\n");
      packages++;
    }
    if (url && readme) {
      const linked = withDocsLine(readme, url);
      if (linked !== readme) { save(readmeFile, readme); writeFileSync(readmeFile, linked); }
    }
  }
  writeFileSync(stateFile, JSON.stringify(originals));
  console.log(`prepare-publish: prepared ${packages} package(s) for publishing (working tree only; --restore puts them back)`);
}
