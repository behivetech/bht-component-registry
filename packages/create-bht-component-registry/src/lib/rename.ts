import { existsSync } from "node:fs";
import { readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { titleCaseScope } from "./config.js";
import { isTextFile, listFiles, readText, writeText } from "./fs.js";

/** The scope the template ships with; `create` renames it to the owner's. */
export const TEMPLATE_SCOPE = "example";

export interface ScopeRename {
  fromScope: string;
  toScope: string;
  fromName: string;
  toName: string;
}

export function scopeRename(toScope: string, fromScope = TEMPLATE_SCOPE): ScopeRename {
  return { fromScope, toScope, fromName: titleCaseScope(fromScope), toName: titleCaseScope(toScope) };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The narrow rewrite for component sources: package names (`@example/`) and
 * registry paths (`registry/example`). Nothing else, because a component's
 * README or composition may legitimately say "example" or link example.com.
 */
export function rewritePackageRefs(text: string, r: ScopeRename): string {
  if (r.fromScope === r.toScope) return text;
  const pathPattern = new RegExp(`registry/${escapeRegExp(r.fromScope)}(?![A-Za-z0-9-])`, "g");
  return text.replaceAll(`@${r.fromScope}/`, `@${r.toScope}/`).replace(pathPattern, `registry/${r.toScope}`);
}

/**
 * The broad rewrite for the few template files that talk ABOUT the example
 * scope (the e2e spec, the docs app's dependency list): every standalone
 * `example` becomes the owner's scope and every standalone `Example` becomes
 * its display name. This is deliberately a straightforward word replace, not
 * a parser. The one refinement: an `Example` that is a JS identifier
 * (`const Example =`, `<Example />`) is kept, because a display name such as
 * "Acme Corp" is not a valid identifier.
 */
export function rewriteScopeMentions(text: string, r: ScopeRename): string {
  if (r.fromScope === r.toScope) return text;
  const slug = new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(r.fromScope)}(?![A-Za-z0-9_-])`, "g");
  const name = new RegExp(
    `(?<![\\w<])(?<!\\b(?:const|let|var|function|class|type|interface|enum)\\s+)${escapeRegExp(r.fromName)}(?!\\w)`,
    "g",
  );
  return text.replace(slug, r.toScope).replace(name, r.toName);
}

/**
 * Flips `"private": true` to `false` in a component's package.json, keeping
 * the key where it already sits (or adding it after `version` when absent).
 *
 * The template's example packages are private so the template repo's own
 * release workflow cannot publish `@example/*` (changesets/action runs
 * `changeset publish`, which publishes anything not yet on the registry).
 * The owner's renamed copies must be publishable, or their first
 * `pnpm release` would silently skip every component.
 */
export function markPublishable(text: string): string {
  const pkg = JSON.parse(text) as Record<string, unknown>;
  if (pkg.private === false) return text;
  if ("private" in pkg) {
    pkg.private = false;
    return `${JSON.stringify(pkg, null, 2)}\n`;
  }
  const ordered: Record<string, unknown> = {};
  const anchor = "version" in pkg ? "version" : "name";
  let inserted = false;
  for (const [key, value] of Object.entries(pkg)) {
    ordered[key] = value;
    if (key === anchor) {
      ordered.private = false;
      inserted = true;
    }
  }
  if (!inserted) ordered.private = false;
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** The package.json of each component: exactly `registry/<scope>/<category>/<name>/package.json`. */
function isComponentPackageJson(relToScope: string): boolean {
  const parts = relToScope.split("/");
  return parts.length === 3 && parts[2] === "package.json";
}

/**
 * Moves `registry/<from>` to `registry/<to>`, rewrites package references in
 * every text file inside it, makes every component package publishable and
 * sets scope.json's display name. Returns the files whose content changed
 * (root-relative), for the summary.
 */
export async function renameScopeTree(root: string, r: ScopeRename): Promise<string[]> {
  const from = join(root, "registry", r.fromScope);
  const to = join(root, "registry", r.toScope);
  if (!existsSync(from) || r.fromScope === r.toScope) return [];
  if (existsSync(to) && (await readdir(to)).length > 0) {
    throw new Error(`registry/${r.toScope} already exists in the template; cannot rename registry/${r.fromScope} onto it.`);
  }
  await rename(from, to);

  const changed: string[] = [];
  for (const rel of await listFiles(to)) {
    if (!isTextFile(rel)) continue;
    const path = join(to, rel);
    const before = await readText(path);
    let after = rewritePackageRefs(before, r);
    if (isComponentPackageJson(rel)) after = markPublishable(after);
    if (after !== before) {
      await writeText(path, after);
      changed.push(`registry/${r.toScope}/${rel}`);
    }
  }

  const scopeJson = join(to, "scope.json");
  const meta: Record<string, unknown> = existsSync(scopeJson)
    ? (JSON.parse(await readText(scopeJson)) as Record<string, unknown>)
    : {};
  await writeText(scopeJson, `${JSON.stringify({ ...meta, name: r.toName }, null, 2)}\n`);
  changed.push(`registry/${r.toScope}/scope.json`);
  return changed;
}

/**
 * Pending changesets name packages by their published name, so a changeset
 * shipped with the template must follow the rename or `changeset version`
 * would fail on an unknown package.
 */
export async function rewriteChangesets(root: string, r: ScopeRename): Promise<string[]> {
  const dir = join(root, ".changeset");
  if (!existsSync(dir)) return [];
  const changed: string[] = [];
  for (const entry of await readdir(dir)) {
    if (!entry.endsWith(".md")) continue;
    const path = join(dir, entry);
    const before = await readText(path);
    const after = rewritePackageRefs(before, r);
    if (after !== before) {
      await writeText(path, after);
      changed.push(`.changeset/${entry}`);
    }
  }
  return changed;
}

/**
 * The lockfile keys workspace packages by path (`registry/example/atoms/...`)
 * and name (`@example/atoms....`, as `link:` specifiers). Renaming both keeps
 * it valid, so the owner's first `pnpm install --frozen-lockfile` (what the
 * shipped CI runs) succeeds instead of failing on importers that no longer exist.
 */
export async function rewriteLockfile(root: string, r: ScopeRename): Promise<string[]> {
  const path = join(root, "pnpm-lock.yaml");
  if (!existsSync(path)) return [];
  const before = await readText(path);
  const after = rewritePackageRefs(before, r);
  if (after === before) return [];
  await writeText(path, after);
  return ["pnpm-lock.yaml"];
}

/** Applies `rewriteScopeMentions` to each listed file that exists; returns the ones that changed. */
export async function rewriteScopeFiles(root: string, files: string[], r: ScopeRename): Promise<string[]> {
  const changed: string[] = [];
  for (const rel of files) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const before = await readText(path);
    const after = rewriteScopeMentions(before, r);
    if (after !== before) {
      await writeText(path, after);
      changed.push(rel);
    }
  }
  return changed;
}
