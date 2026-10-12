import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CONFIG_FILE,
  compareVersions,
  findRegistryRoot,
  isVersion,
  readRegistryConfig,
  writeRegistryConfig,
} from "../lib/config.js";
import { listFiles, readText, removeFile, writeBytes, writeText } from "../lib/fs.js";
import { errorMessage, log as defaultLog, type Logger } from "../lib/log.js";
import {
  isManagedPage,
  isTemplateOnly,
  isTemplateOwned,
  mergeReadme,
  readManifest,
  splitReadme,
  type TemplateManifest,
} from "../lib/manifest.js";
import { interactivePrompter, type Prompter } from "../lib/prompt.js";
import { rewriteScopeMentions, scopeRename, type ScopeRename } from "../lib/rename.js";
import { isGitTreeClean } from "../lib/run.js";
import { fetchTemplate, type TemplateFetcher } from "../lib/template.js";
import { readOwnVersion } from "../lib/version.js";

export interface UpdateOptions {
  /** Target template version; default is this CLI's version. */
  to?: string;
  /** Dev mode: update from a local checkout instead of downloading. */
  from?: string;
  dryRun: boolean;
  yes: boolean;
  /** Bring back guide pages the owner deleted. */
  restoreGuide?: boolean;
}

export interface UpdateDeps {
  fetchTemplate: TemplateFetcher;
  isTreeClean: (cwd: string) => Promise<boolean>;
  prompt: Prompter;
  cwd: string;
  log: Logger;
}

export interface FileChange {
  path: string;
  content: Buffer | string;
}

export type ReadmeStatus = "added" | "merged" | "unchanged" | "no-marker" | "absent";

/**
 * The template's guide pages (docs/**, frontmatter `managed: true`) are the
 * owner's to edit, so they are not owned. They follow the rule package
 * managers use for config files: a page that is byte-identical to the one
 * its template version shipped is refreshed; one the owner changed is kept
 * and listed; `managed: false` (or no frontmatter) opts out of the listing
 * too; a page the owner deleted stays deleted unless asked for back.
 */
export interface GuidePlan {
  /** Unedited since the previous template: replaced by the target's version. */
  refreshed: FileChange[];
  /** New in the target (not in the previous template): added. */
  added: FileChange[];
  /** Deleted locally, brought back because --restore-guide was given. */
  restored: FileChange[];
  /** Edited locally and newer in the target: kept, reported. */
  customised: string[];
  /** Deleted locally: left deleted, reported. */
  removed: string[];
}

export interface UpdatePlan {
  added: FileChange[];
  replaced: FileChange[];
  removed: string[];
  readme: { status: ReadmeStatus; content?: string };
  /** rewriteScope files present in the target that had the owner's scope re-applied. */
  rewritten: string[];
  guide: GuidePlan;
}

function defaultDeps(): UpdateDeps {
  return { fetchTemplate, isTreeClean: isGitTreeClean, prompt: interactivePrompter, cwd: process.cwd(), log: defaultLog };
}

function sameBytes(local: Buffer, content: Buffer | string): boolean {
  return typeof content === "string" ? local.equals(Buffer.from(content, "utf8")) : local.equals(content);
}

/**
 * README.md is neither owned nor protected: the part above the marker is the
 * template's, the rest is the owner's. Without a local marker nothing is
 * touched, since there is no way to know which part is which.
 */
async function planReadme(root: string, templateDir: string, marker: string): Promise<UpdatePlan["readme"]> {
  const targetPath = join(templateDir, "README.md");
  if (!existsSync(targetPath)) return { status: "absent" };
  const target = await readText(targetPath);
  const localPath = join(root, "README.md");
  if (!existsSync(localPath)) return { status: "added", content: target };
  const local = await readText(localPath);
  if (!splitReadme(local, marker)) return { status: "no-marker" };
  const merged = mergeReadme(local, target, marker);
  if (merged === null || merged === local) return { status: "unchanged" };
  return { status: "merged", content: merged };
}

/**
 * The guide-page rule, applied to every managed page the target ships. The
 * previous template (the version the repo was last updated to) is what says
 * whether a local page is pristine; without it (the download failed, or the
 * repo predates managed pages) a page that differs from the target is
 * treated as customised, which is the safe reading.
 */
export async function planGuide(
  root: string,
  templateDir: string,
  previousDir: string | null,
  restoreGuide: boolean,
): Promise<GuidePlan> {
  const plan: GuidePlan = { refreshed: [], added: [], restored: [], customised: [], removed: [] };
  const targetFiles = (await listFiles(templateDir)).filter((file) => file.startsWith("docs/") && file.endsWith(".md"));
  for (const file of targetFiles) {
    const target = await readText(join(templateDir, file));
    if (!isManagedPage(target)) continue;
    const previousPath = previousDir ? join(previousDir, file) : null;
    const inPrevious = previousPath !== null && existsSync(previousPath);
    const localPath = join(root, file);

    if (!existsSync(localPath)) {
      if (!inPrevious) plan.added.push({ path: file, content: target });
      else if (restoreGuide) plan.restored.push({ path: file, content: target });
      else plan.removed.push(file);
      continue;
    }
    const local = await readText(localPath);
    // The owner opted out (`managed: false`, or dropped the frontmatter).
    if (!isManagedPage(local)) continue;
    if (local === target) continue;
    const pristine = inPrevious && local === (await readText(previousPath!));
    if (pristine) plan.refreshed.push({ path: file, content: target });
    else plan.customised.push(file);
  }
  return plan;
}

/**
 * Pure planning: what the target owns that differs from the local tree. Files
 * listed under `rewriteScope` are compared AFTER the owner's scope is re-applied,
 * so an e2e spec that only differs by scope name is correctly reported as unchanged.
 * Template-only paths are never copied, and any present locally (left behind by
 * an older template that still shipped them) are removed. Guide pages are
 * planned separately — see planGuide.
 */
export async function planUpdate(
  root: string,
  templateDir: string,
  manifest: TemplateManifest,
  rename: ScopeRename,
  previousDir: string | null = null,
  restoreGuide = false,
): Promise<UpdatePlan> {
  const owned = (file: string) => file !== "README.md" && isTemplateOwned(file, manifest);
  const targetFiles = (await listFiles(templateDir)).filter(owned);
  const allLocal = await listFiles(root);
  const localFiles = allLocal.filter(owned);
  const strayTemplateOnly = allLocal.filter((file) => isTemplateOnly(file, manifest));
  const targetSet = new Set(targetFiles);
  const localSet = new Set(localFiles);
  const rewriteSet = new Set(manifest.rewriteScope);

  const added: FileChange[] = [];
  const replaced: FileChange[] = [];
  const rewritten: string[] = [];
  for (const file of targetFiles) {
    let content: Buffer | string = await readFile(join(templateDir, file));
    if (rewriteSet.has(file)) {
      const original = content.toString("utf8");
      content = rewriteScopeMentions(original, rename);
      if (content !== original) rewritten.push(file);
    }
    if (!localSet.has(file)) {
      added.push({ path: file, content });
      continue;
    }
    if (!sameBytes(await readFile(join(root, file)), content)) replaced.push({ path: file, content });
  }
  const removed = [...localFiles.filter((file) => !targetSet.has(file)), ...strayTemplateOnly].sort();
  const readme = await planReadme(root, templateDir, manifest.readmeMarker);
  const guide = await planGuide(root, templateDir, previousDir, restoreGuide);
  return { added, replaced, removed, readme, rewritten, guide };
}

export async function applyPlan(root: string, plan: UpdatePlan): Promise<void> {
  for (const change of [...plan.added, ...plan.replaced, ...plan.guide.refreshed, ...plan.guide.added, ...plan.guide.restored]) {
    await writeBytes(join(root, change.path), change.content);
  }
  for (const file of plan.removed) await removeFile(root, file);
  if (plan.readme.content !== undefined) await writeText(join(root, "README.md"), plan.readme.content);
}

function printList(title: string, files: string[], log: Logger): void {
  if (files.length === 0) return;
  log.info(`${title} (${files.length}):`);
  for (const file of files) log.info(`  ${file}`);
  log.blank();
}

export function planIsEmpty(plan: UpdatePlan): boolean {
  const { guide } = plan;
  return (
    plan.added.length === 0 &&
    plan.replaced.length === 0 &&
    plan.removed.length === 0 &&
    plan.readme.content === undefined &&
    guide.refreshed.length === 0 &&
    guide.added.length === 0 &&
    guide.restored.length === 0
  );
}

function printGuide(guide: GuidePlan, log: Logger): void {
  printList("Guide pages refreshed (unedited since your template version)", guide.refreshed.map((c) => c.path), log);
  printList("Guide pages added", guide.added.map((c) => c.path), log);
  printList("Guide pages restored", guide.restored.map((c) => c.path), log);
  if (guide.customised.length > 0) {
    printList("Guide pages you edited — kept; a newer template version exists", guide.customised, log);
    log.info("  Compare with the template's copy when convenient, or set `managed: false` in the page's frontmatter to stop hearing about it.");
    log.blank();
  }
  if (guide.removed.length > 0) {
    printList("Guide pages you removed — left out", guide.removed, log);
    log.info("  Run update with --restore-guide to bring them back.");
    log.blank();
  }
}

function printPlan(plan: UpdatePlan, manifest: TemplateManifest, scope: string, log: Logger): void {
  printList("Added", plan.added.map((change) => change.path), log);
  printList("Replaced", plan.replaced.map((change) => change.path), log);
  printList("Removed", plan.removed, log);
  printGuide(plan.guide, log);
  switch (plan.readme.status) {
    case "added":
      log.info("README.md: added from the template.");
      break;
    case "merged":
      log.info("README.md: the part above the marker is replaced; your notes below it are kept.");
      break;
    case "no-marker":
      log.warn(`README.md has no "${manifest.readmeMarker}" line, so it is left untouched. Put that line above your own notes to let update refresh the template's part.`);
      break;
    default:
      break;
  }
  if (plan.rewritten.length > 0) {
    log.info(`Scope "${scope}" re-applied in: ${plan.rewritten.join(", ")}`);
  }
  if (planIsEmpty(plan)) log.info("Every template-owned file already matches the target.");
}

/** False (with a message) when the local template is already at or past the target. */
function isBehind(current: string, target: string, log: Logger): boolean {
  if (compareVersions(current, target) >= 0) {
    log.info(`Already at template ${current} (target ${target}); nothing to do.`);
    return false;
  }
  return true;
}

/** Returns the process exit code; never calls process.exit so it can be tested. */
export async function update(options: UpdateOptions, overrides: Partial<UpdateDeps> = {}): Promise<number> {
  const deps: UpdateDeps = { ...defaultDeps(), ...overrides };
  const { log } = deps;
  try {
    const root = findRegistryRoot(deps.cwd);
    if (!root) {
      log.error(`No ${CONFIG_FILE} found in ${deps.cwd} or any parent directory. Run update inside a registry created with create-bht-component-registry.`);
      return 1;
    }
    if (!(await deps.isTreeClean(root))) {
      log.error("Commit or stash your changes first; update replaces template-owned files and you'll want a clean diff.");
      return 1;
    }

    const config = await readRegistryConfig(root);
    const requested = options.to ?? readOwnVersion();
    if (!isVersion(requested)) {
      log.error(`--to must be x.y.z, got "${requested}".`);
      return 1;
    }
    // Without --from the version is known up front, so skip the download when
    // there is nothing to do. With --from, the checkout decides the version.
    if (options.from === undefined && !isBehind(config.templateVersion, requested, log)) return 0;

    const template = await deps.fetchTemplate({ version: requested, from: options.from }, log);
    try {
      const targetVersion =
        options.from !== undefined && options.to === undefined
          ? (await readRegistryConfig(template.dir)).templateVersion
          : requested;
      if (options.from !== undefined && !isBehind(config.templateVersion, targetVersion, log)) return 0;

      const manifest = await readManifest(template.dir);
      const rename = scopeRename(config.scope);

      // The template this repo is currently on, to tell an unedited guide
      // page from an edited one. Optional: without it every differing page
      // counts as edited, which never overwrites anyone's work.
      let previous: Awaited<ReturnType<TemplateFetcher>> | null = null;
      try {
        previous = await deps.fetchTemplate({ version: config.templateVersion }, log);
      } catch (error) {
        log.warn(
          `Could not fetch template ${config.templateVersion} to compare guide pages (${errorMessage(error)}); pages that differ from the target are treated as edited and left alone.`,
        );
      }
      const plan = await planUpdate(root, template.dir, manifest, rename, previous?.dir ?? null, options.restoreGuide === true);
      await previous?.cleanup();

      const prefix = options.dryRun ? "[dry run] " : "";
      log.blank();
      log.info(`${prefix}Updating template ${config.templateVersion} → ${targetVersion} in ${root}`);
      log.blank();
      printPlan(plan, manifest, config.scope, log);
      if (options.dryRun) {
        log.info("Dry run: nothing was changed.");
        return 0;
      }
      if (!options.yes) {
        const ok = await deps.prompt.confirm({ message: "Apply these changes?", initial: true });
        if (!ok) {
          log.info("Cancelled; nothing was changed.");
          return 1;
        }
      }

      await applyPlan(root, plan);
      await writeRegistryConfig(root, { ...config, templateVersion: targetVersion });
      log.blank();
      log.success(`Updated to template ${targetVersion}.`);
      log.info("Review with `git diff`, then run `pnpm install && pnpm verify`.");
      log.blank();
      return 0;
    } finally {
      await template.cleanup();
    }
  } catch (error) {
    log.error(errorMessage(error));
    return 1;
  }
}
