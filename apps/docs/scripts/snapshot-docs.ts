/**
 * Snapshots each component's docs at its current version into
 * docs-history/<scope>/<category>/<name>/<version>/, so the site can keep a
 * page per released version (see apps/docs/default-docs/guide/versioned-docs.md).
 *
 * Runs as the last step of `pnpm version-packages`, right after Changesets
 * bumps the versions, so a snapshot lands in the same commit as the bump and
 * cannot be forgotten. A snapshot is plain files — the README, the source the
 * Code tab shows (tests excluded), the examples, the docgen output
 * (`docs.json`) and a small `snapshot.json` — never git archaeology, so the
 * build works on a shallow clone with no network. The CHANGELOG is not copied:
 * the site slices the live one at the snapshot's version.
 *
 *   pnpm snapshot-docs                     versions with no snapshot yet (the default; quiet when idle)
 *   pnpm snapshot-docs --all               every eligible package at its current version (seeding)
 *   pnpm snapshot-docs --force             rewrite snapshots that already exist
 *   pnpm snapshot-docs --include-private   also private and 0.0.0 packages (the template's example fixture)
 *   pnpm snapshot-docs --dry-run           say what would happen
 *
 * Private packages and 0.0.0 versions are skipped by default: Changesets never
 * versions a private package, and nothing unreleased deserves a permalink.
 */
import fs from "node:fs";
import path from "node:path";
import { docsJsonFor } from "@bht-component-registry/env/docgen";
import { applyKeep, VERSION, type KeepPolicy } from "../src/lib/catalog/history";
import {
  SNAPSHOT_META_FILE,
  historyDir,
  registryEntries,
  type RegistryEntry,
  type SnapshotMeta,
} from "./lib/registry-entries";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(APP_DIR, "../..");

/** The files a snapshot copies: what the Code tab shows, minus tests and tooling. */
const SNAPSHOT_EXTENSIONS = new Set([".tsx", ".ts", ".scss", ".json", ".md"]);
const SNAPSHOT_SKIP = new Set([
  "package.json",
  "tsconfig.json",
  "tsup.config.ts",
  "eslint.config.mjs",
  "global.d.ts",
  "CHANGELOG.md",
  "docs.json",
  SNAPSHOT_META_FILE,
]);
const isTest = (file: string) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(file);

interface Options {
  all: boolean;
  force: boolean;
  includePrivate: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { all: false, force: false, includePrivate: false, dryRun: false };
  for (const arg of argv) {
    if (arg === "--") continue; // pnpm forwards it when a caller writes `pnpm snapshot-docs -- --all`
    if (arg === "--all") options.all = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--include-private") options.includePrivate = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("pnpm snapshot-docs [--all] [--force] [--include-private] [--dry-run]");
      process.exit(0);
    } else throw new Error(`Unknown option ${arg}. Try --help.`);
  }
  return options;
}

interface Config {
  templateVersion: string;
  docs?: { history?: { enabled?: boolean; keep?: KeepPolicy } };
}

function readConfig(): Config {
  const file = path.join(REPO_ROOT, "registry.config.json");
  if (!fs.existsSync(file)) throw new Error("registry.config.json is missing at the repo root.");
  return JSON.parse(fs.readFileSync(file, "utf8")) as Config;
}

const snapshotFiles = (dir: string) =>
  fs
    .readdirSync(dir)
    .filter(
      (f) =>
        !SNAPSHOT_SKIP.has(f) &&
        !isTest(f) &&
        SNAPSHOT_EXTENSIONS.has(path.extname(f)) &&
        fs.statSync(path.join(dir, f)).isFile(),
    )
    .sort();

function writeSnapshot(entry: RegistryEntry, version: string, templateVersion: string, dryRun: boolean): string[] {
  const target = path.join(historyDir(REPO_ROOT, entry), version);
  const files = snapshotFiles(entry.dir);
  if (dryRun) return files;
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) fs.copyFileSync(path.join(entry.dir, file), path.join(target, file));
  // The props and function docs: the file the package's build wrote if it is
  // there, else computed now from the source (cross-package prop types resolve
  // best after `pnpm build`; the guide says to build before versioning).
  const built = path.join(entry.dir, "docs.json");
  const docsJson = fs.existsSync(built)
    ? JSON.parse(fs.readFileSync(built, "utf8"))
    : docsJsonFor(entry.dir);
  fs.writeFileSync(path.join(target, "docs.json"), `${JSON.stringify(docsJson, null, 2)}\n`);
  const registry = (entry.pkg.registry ?? {}) as { status?: unknown; tags?: unknown };
  const meta: SnapshotMeta = {
    version,
    packageName: String(entry.pkg.name),
    date: new Date().toISOString().slice(0, 10),
    status: String(registry.status ?? "stable").toLowerCase(),
    tags: Array.isArray(registry.tags) ? registry.tags.map(String) : [],
    templateVersion,
  };
  fs.writeFileSync(path.join(target, SNAPSHOT_META_FILE), `${JSON.stringify(meta, null, 2)}\n`);
  return files;
}

/** Deletes the snapshot folders the keep policy drops; returns what went. */
function prune(entry: RegistryEntry, keep: KeepPolicy, dryRun: boolean): string[] {
  const dir = historyDir(REPO_ROOT, entry);
  if (!fs.existsSync(dir)) return [];
  const versions = fs.readdirSync(dir).filter((v) => VERSION.test(v));
  const kept = new Set(applyKeep(versions, keep));
  const dropped = versions.filter((v) => !kept.has(v));
  if (!dryRun) for (const v of dropped) fs.rmSync(path.join(dir, v), { recursive: true, force: true });
  return dropped;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = readConfig();
  const history = config.docs?.history ?? {};
  if (history.enabled === false) {
    console.log("docs.history.enabled is false in registry.config.json; no snapshots written.");
    return;
  }
  const keep: KeepPolicy = history.keep ?? "all";
  const written: string[] = [];
  const skipped: string[] = [];
  const pruned: string[] = [];

  for (const entry of registryEntries(REPO_ROOT)) {
    const version = String(entry.pkg.version ?? "");
    const label = `${entry.pkg.name}@${version}`;
    if (!VERSION.test(version)) {
      skipped.push(`${label}: not a version`);
      continue;
    }
    if (!options.includePrivate && (entry.pkg.private === true || version === "0.0.0")) {
      skipped.push(`${label}: ${entry.pkg.private ? "private" : "unreleased"} (use --include-private)`);
      continue;
    }
    const exists = fs.existsSync(path.join(historyDir(REPO_ROOT, entry), version));
    if (exists && !options.force) {
      if (options.all) skipped.push(`${label}: already snapshotted`);
      continue;
    }
    const files = writeSnapshot(entry, version, config.templateVersion, options.dryRun);
    written.push(`${label} (${files.length} files + docs.json)`);
    for (const v of prune(entry, keep, options.dryRun)) pruned.push(`${entry.pkg.name}@${v}`);
  }

  const verb = options.dryRun ? "would write" : "wrote";
  if (written.length === 0) console.log("docs-history: nothing to snapshot.");
  else {
    console.log(`docs-history: ${verb} ${written.length} snapshot(s):`);
    for (const line of written) console.log(`  + ${line}`);
  }
  if (pruned.length > 0) {
    console.log(`docs-history: keep = ${JSON.stringify(keep)}, ${options.dryRun ? "would prune" : "pruned"}:`);
    for (const line of pruned) console.log(`  - ${line}`);
  }
  if (skipped.length > 0 && (options.all || options.dryRun)) {
    for (const line of skipped) console.log(`  · ${line}`);
  }
}

main();
