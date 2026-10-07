import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, sep } from "node:path";

/**
 * Paths that are never part of a template, whichever way it arrives: installs,
 * build output, VCS, tool caches (Next; `.turbo` from older templates) and
 * data the build regenerates. The same rule filters a `--from` checkout and
 * the owner's repo during `update`, so build output can never be mistaken
 * for a template-owned file.
 */
const SKIP_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".turbo",
  ".next",
  "out",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
]);
const SKIP_PREFIXES = ["apps/docs/src/generated"];
const GENERATED_DOCS_JSON = /^registry\/.+\/docs\.json$/;

const TEXT_EXTENSIONS = new Set([
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".md",
  ".mdx",
  ".scss",
  ".css",
  ".yaml",
  ".yml",
  ".hbs",
  ".txt",
  ".html",
]);
const TEXT_BASENAMES = new Set([".gitignore", ".npmrc", ".gitkeep", "LICENSE"]);

export function toPosix(path: string): string {
  return path.split(sep).join("/");
}

export function shouldSkip(relPath: string): boolean {
  if (relPath === "") return false;
  if (relPath.split("/").some((segment) => SKIP_SEGMENTS.has(segment))) return true;
  if (SKIP_PREFIXES.some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`))) return true;
  return GENERATED_DOCS_JSON.test(relPath);
}

/** Files the scope rename may rewrite; binaries (images, fonts) are left alone. */
export function isTextFile(path: string): boolean {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase()) || TEXT_BASENAMES.has(basename(path));
}

/** Every file under `root` as a sorted, posix, root-relative path, minus `shouldSkip`. */
export async function listFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = toPosix(relative(root, abs));
      if (shouldSkip(rel)) continue;
      if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile() || entry.isSymbolicLink()) found.push(rel);
    }
  }
  if (!existsSync(root)) return found;
  await walk(root);
  return found.sort();
}

/**
 * Copies a template checkout into `dest`, leaving installs and build output
 * behind. `skip` gets each root-relative path (directories included) and can
 * veto more; returning true for a directory skips its whole subtree.
 */
export async function copyTree(src: string, dest: string, skip?: (relPath: string) => boolean): Promise<void> {
  await cp(src, dest, {
    recursive: true,
    filter: (source) => {
      const rel = toPosix(relative(src, source));
      return !shouldSkip(rel) && !(skip?.(rel) ?? false);
    },
  });
}

export async function copyFileInto(src: string, dest: string): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

export function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function writeText(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

export async function writeBytes(path: string, content: Buffer | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

/** True when the path does not exist or is a directory with nothing in it. */
export async function isDirEmpty(path: string): Promise<boolean> {
  if (!existsSync(path)) return true;
  const info = await stat(path);
  if (!info.isDirectory()) return false;
  return (await readdir(path)).length === 0;
}

/**
 * Removes one file, then any directories it leaves empty up to (not including)
 * `root`, because git does not track empty directories and a stray one would
 * make the post-update tree differ from a fresh `create`.
 */
export async function removeFile(root: string, relPath: string): Promise<void> {
  await rm(join(root, relPath), { force: true });
  let dir = dirname(join(root, relPath));
  while (dir !== root && dir.startsWith(root)) {
    if (!existsSync(dir) || (await readdir(dir)).length > 0) break;
    await rm(dir, { recursive: true });
    dir = dirname(dir);
  }
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
