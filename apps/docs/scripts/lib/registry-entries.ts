import fs from "node:fs";
import path from "node:path";

/** One package folder under registry/<scope>/<category>/<name>. */
export interface RegistryEntry {
  scope: string;
  category: string;
  name: string;
  /** Absolute folder. */
  dir: string;
  /** "registry/<scope>/<category>/<name>" */
  relativeDir: string;
  pkg: Record<string, unknown> & { name?: string; version?: string; private?: boolean };
}

/**
 * The walk both the catalog generator and the snapshot script start from: the
 * folder tree is the registry, so every package.json three levels under
 * registry/ is a component. Sorted, so output order is stable.
 */
export function registryEntries(repoRoot: string): RegistryEntry[] {
  const registryDir = path.join(repoRoot, "registry");
  const entries: RegistryEntry[] = [];
  if (!fs.existsSync(registryDir)) return entries;
  for (const scope of fs.readdirSync(registryDir).sort()) {
    const scopeDir = path.join(registryDir, scope);
    if (!fs.statSync(scopeDir).isDirectory() || scope.startsWith(".")) continue;
    for (const category of fs.readdirSync(scopeDir).sort()) {
      const categoryDir = path.join(scopeDir, category);
      if (!fs.statSync(categoryDir).isDirectory()) continue;
      for (const name of fs.readdirSync(categoryDir).sort()) {
        const dir = path.join(categoryDir, name);
        const pkgFile = path.join(dir, "package.json");
        if (!fs.existsSync(pkgFile)) continue;
        entries.push({
          scope,
          category,
          name,
          dir,
          relativeDir: path.relative(repoRoot, dir).split(path.sep).join("/"),
          pkg: JSON.parse(fs.readFileSync(pkgFile, "utf8")),
        });
      }
    }
  }
  return entries;
}

/** Source languages the Code tab shows, by extension. */
export const SOURCE_LANGUAGES = {
  ".tsx": "tsx",
  ".ts": "ts",
  ".scss": "scss",
  ".json": "json",
  ".md": "markdown",
} as const;

/** Tooling and metadata files that are never part of a component's shown source. */
export const SOURCE_SKIP = new Set([
  "package.json",
  "tsconfig.json",
  "tsup.config.ts",
  "eslint.config.mjs",
  "global.d.ts",
  "CHANGELOG.md",
  "README.md",
  "docs.json",
  "snapshot.json",
]);

export const isTestFile = (file: string) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(file);

/**
 * The component's own source files in `dir`: what the Code tab shows, and —
 * with `includeTests: false` — what a docs snapshot copies (a past version's
 * tests are not documentation). One rule, used by the generator and the
 * snapshot script, so the two can never drift.
 */
export function sourceFileNames(dir: string, { includeTests = true } = {}): string[] {
  return fs
    .readdirSync(dir)
    .filter(
      (f) =>
        !SOURCE_SKIP.has(f) &&
        (includeTests || !isTestFile(f)) &&
        path.extname(f) in SOURCE_LANGUAGES &&
        fs.statSync(path.join(dir, f)).isFile(),
    )
    .sort();
}

/** The folder a component's snapshots live in: docs-history/<scope>/<category>/<name>. */
export const historyDir = (repoRoot: string, entry: Pick<RegistryEntry, "scope" | "category" | "name">) =>
  path.join(repoRoot, "docs-history", entry.scope, entry.category, entry.name);

/** What a snapshot records about itself, next to the copied files. */
export interface SnapshotMeta {
  version: string;
  packageName: string;
  /** ISO date the snapshot was written. */
  date: string;
  status: string;
  tags: string[];
  /** The template version that wrote it, for forward compatibility. */
  templateVersion: string;
}

export const SNAPSHOT_META_FILE = "snapshot.json";
