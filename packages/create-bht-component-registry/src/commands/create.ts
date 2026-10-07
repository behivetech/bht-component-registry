import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  CONFIG_FILE,
  isVersion,
  parseRegistryConfig,
  scopeProblemMessage,
  titleCaseScope,
  writeRegistryConfig,
  type RegistryConfig,
} from "../lib/config.js";
import { copyTree, isDirEmpty, isInside, readText, writeText } from "../lib/fs.js";
import { errorMessage, log as defaultLog, type Logger } from "../lib/log.js";
import { DEFAULT_MANIFEST, MANIFEST_FILE, isTemplateOnly, readManifest, type TemplateManifest } from "../lib/manifest.js";
import { interactivePrompter, type Prompter } from "../lib/prompt.js";
import { renameScopeTree, rewriteChangesets, rewriteLockfile, rewriteScopeFiles, scopeRename } from "../lib/rename.js";
import { runPnpm, type Runner } from "../lib/run.js";
import { fetchTemplate, type TemplateFetcher } from "../lib/template.js";
import { readOwnVersion } from "../lib/version.js";

export const DEFAULT_REGISTRY = "https://registry.npmjs.org";
export const DEFAULT_CATEGORIES = ["atoms", "molecules", "organisms", "templates", "forms"];
export const DEFAULT_DIR = "my-registry";

const CATEGORY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export interface CreateOptions {
  /** Target directory, relative to cwd. Prompted when missing. */
  dir?: string;
  scope?: string;
  registry?: string;
  categories?: string[];
  templateVersion?: string;
  /** Dev mode: scaffold from a local checkout instead of downloading. */
  from?: string;
  /** Run `pnpm install` and `pnpm build` afterwards. */
  install: boolean;
  /** Accept defaults instead of prompting; scope still has to be given. */
  yes: boolean;
}

/**
 * Everything with a side effect outside the target directory is injectable,
 * so the test suite runs without network, pnpm or a TTY.
 */
export interface CreateDeps {
  fetchTemplate: TemplateFetcher;
  runPnpm: Runner;
  prompt: Prompter;
  cwd: string;
  log: Logger;
}

export interface ScopeChoices {
  scope: string;
  registry: string;
  categories: string[];
  templateVersion: string;
}

function defaultDeps(): CreateDeps {
  return { fetchTemplate, runPnpm, prompt: interactivePrompter, cwd: process.cwd(), log: defaultLog };
}

async function resolveDir(options: CreateOptions, deps: CreateDeps): Promise<string | undefined> {
  if (options.dir) return options.dir;
  if (options.yes) return DEFAULT_DIR;
  const value = await deps.prompt.text({
    message: "Directory for the new registry",
    initial: DEFAULT_DIR,
    validate: (v) => (v.trim() === "" ? "A directory name is required." : true),
  });
  return value?.trim();
}

async function resolveScope(options: CreateOptions, deps: CreateDeps): Promise<string | undefined> {
  if (options.scope !== undefined) {
    const scope = options.scope.trim();
    const problem = scopeProblemMessage(scope);
    if (problem) {
      deps.log.error(problem);
      return undefined;
    }
    return scope;
  }
  if (options.yes) {
    deps.log.error(`--yes needs --scope. ${scopeProblemMessage("")}`);
    return undefined;
  }
  const value = await deps.prompt.text({
    message: "npm scope, without the @ (your components publish as @<scope>/<category>.<name>)",
    validate: (v) => scopeProblemMessage(v.trim()) ?? true,
  });
  return value?.trim();
}

function registryProblem(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "The registry must be an http(s) URL.";
    return null;
  } catch {
    return `"${value}" is not a URL. Example: ${DEFAULT_REGISTRY}`;
  }
}

async function resolveRegistry(options: CreateOptions, deps: CreateDeps): Promise<string | undefined> {
  if (options.registry !== undefined) {
    const problem = registryProblem(options.registry);
    if (problem) {
      deps.log.error(problem);
      return undefined;
    }
    return options.registry.replace(/\/+$/, "");
  }
  if (options.yes) return DEFAULT_REGISTRY;
  const value = await deps.prompt.text({
    message: "npm registry to publish to",
    initial: DEFAULT_REGISTRY,
    validate: (v) => registryProblem(v.trim()) ?? true,
  });
  return value?.trim().replace(/\/+$/, "");
}

function parseCategories(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : value.split(",");
  return [...new Set(list.map((item) => item.trim()).filter((item) => item !== ""))];
}

function categoriesProblem(categories: string[]): string | null {
  if (categories.length === 0) return "At least one category is required, e.g. atoms.";
  const bad = categories.find((category) => !CATEGORY_PATTERN.test(category));
  return bad ? `"${bad}" is not a valid category: lowercase letters, digits and hyphens only.` : null;
}

async function resolveCategories(options: CreateOptions, deps: CreateDeps): Promise<string[] | undefined> {
  if (options.categories !== undefined) {
    const categories = parseCategories(options.categories);
    const problem = categoriesProblem(categories);
    if (problem) {
      deps.log.error(problem);
      return undefined;
    }
    return categories;
  }
  if (options.yes) return DEFAULT_CATEGORIES;
  const value = await deps.prompt.text({
    message: "Starter categories, comma-separated",
    initial: DEFAULT_CATEGORIES.join(","),
    validate: (v) => categoriesProblem(parseCategories(v)) ?? true,
  });
  return value === undefined ? undefined : parseCategories(value);
}

/**
 * The owner's config is the template's config with their choices applied.
 * The template's GitHub link points at the template repo, not at theirs, so
 * it goes; the hosted-version link is still true for them and stays.
 */
async function writeConfig(target: string, choices: ScopeChoices): Promise<void> {
  const path = join(target, CONFIG_FILE);
  const base: RegistryConfig = existsSync(path)
    ? parseRegistryConfig(await readText(path))
    : {
        $schema: "./registry.config.schema.json",
        scope: choices.scope,
        npmRegistry: choices.registry,
        templateVersion: choices.templateVersion,
        site: { title: "" },
      };
  await writeRegistryConfig(target, {
    ...base,
    scope: choices.scope,
    npmRegistry: choices.registry,
    templateVersion: choices.templateVersion,
    site: {
      ...base.site,
      title: `${titleCaseScope(choices.scope)} Component Registry`,
      links: (base.site.links ?? []).filter((link) => link.label !== "GitHub"),
    },
  });
}

/**
 * Empty category folders get a .gitkeep so the chosen structure is visible in
 * the first commit. The catalog generator only looks at directories with a
 * package.json, so the marker file is invisible to the site.
 */
async function ensureCategories(target: string, scope: string, categories: string[]): Promise<void> {
  for (const category of categories) {
    const dir = join(target, "registry", scope, category);
    await mkdir(dir, { recursive: true });
    if ((await readdir(dir)).length === 0) await writeText(join(dir, ".gitkeep"), "");
  }
}

/** A template without a manifest (an early or mid-edit checkout) gets the built-in one. */
async function readManifestOrDefault(dir: string): Promise<TemplateManifest> {
  return existsSync(join(dir, MANIFEST_FILE)) ? readManifest(dir) : DEFAULT_MANIFEST;
}

/**
 * The copy filter for template-only paths. Directories come through without a
 * trailing slash, so `foo/` is tested too: that way `foo/**` skips the folder
 * itself instead of creating it empty and then skipping every file inside.
 */
function skipTemplateOnly(manifest: TemplateManifest): (relPath: string) => boolean {
  return (relPath) => isTemplateOnly(relPath, manifest) || isTemplateOnly(`${relPath}/`, manifest);
}

/**
 * Turns a pristine template copy into the owner's registry. Exported so tests
 * can exercise it without prompts; `update` reuses the same rename rules via
 * lib/rename so the owner's scope survives a template refresh.
 */
export async function applyScope(target: string, choices: ScopeChoices): Promise<void> {
  const rename = scopeRename(choices.scope);
  await renameScopeTree(target, rename);
  await rewriteChangesets(target, rename);
  await rewriteLockfile(target, rename);
  await ensureCategories(target, choices.scope, choices.categories);
  await writeConfig(target, choices);
  const manifest = await readManifestOrDefault(target);
  await rewriteScopeFiles(target, manifest.rewriteScope, rename);
}

function printNextSteps(dir: string, scope: string, installed: boolean, log: Logger): void {
  log.blank();
  log.success(`Created ${dir} for @${scope}/*`);
  log.blank();
  log.info("Next steps:");
  log.blank();
  log.info(`  cd ${dir}`);
  if (!installed) log.info("  pnpm install");
  log.info("  pnpm dev");
  log.blank();
  log.info(`Create the npm org for @${scope} at https://www.npmjs.com/org/create before your first \`pnpm release\`.`);
  log.info("Guides: docs/getting-started.md");
  log.info("Hosted & expanded version: https://platform.behivetech.com/expanded");
  log.blank();
}

/** Returns the process exit code; never calls process.exit so it can be tested. */
export async function create(options: CreateOptions, overrides: Partial<CreateDeps> = {}): Promise<number> {
  const deps: CreateDeps = { ...defaultDeps(), ...overrides };
  const { log } = deps;
  try {
    const dir = await resolveDir(options, deps);
    if (dir === undefined) return cancelled(log);
    const target = resolve(deps.cwd, dir);
    if (!(await isDirEmpty(target))) {
      log.error(`${dir} already exists and is not empty. Pick a new directory.`);
      return 1;
    }

    const scope = await resolveScope(options, deps);
    if (scope === undefined) return options.scope === undefined && !options.yes ? cancelled(log) : 1;
    const registry = await resolveRegistry(options, deps);
    if (registry === undefined) return options.registry === undefined && !options.yes ? cancelled(log) : 1;
    const categories = await resolveCategories(options, deps);
    if (categories === undefined) return options.categories === undefined && !options.yes ? cancelled(log) : 1;

    const templateVersion = options.templateVersion ?? readOwnVersion();
    if (!isVersion(templateVersion)) {
      log.error(`--template-version must be x.y.z, got "${templateVersion}".`);
      return 1;
    }

    log.blank();
    log.info(`Creating ${dir} for @${scope}/* ...`);
    const template = await deps.fetchTemplate({ version: templateVersion, from: options.from }, log);
    try {
      if (isInside(template.dir, target)) {
        log.error(`${dir} is inside the template checkout; pick a directory outside ${template.dir}.`);
        return 1;
      }
      // Template-only paths (this CLI's source, the template repo's issue and
      // PR templates) never reach a client repo.
      const manifest = await readManifestOrDefault(template.dir);
      await copyTree(template.dir, target, skipTemplateOnly(manifest));
    } finally {
      await template.cleanup();
    }
    await applyScope(target, { scope, registry, categories, templateVersion });
    log.success(`Scaffolded registry/${scope} and registry.config.json`);

    if (options.install) {
      for (const step of ["install", "build"]) {
        log.blank();
        log.info(`Running pnpm ${step}...`);
        const code = await deps.runPnpm([step], target);
        if (code !== 0) {
          log.blank();
          log.error(`pnpm ${step} failed (exit code ${code}). The project is in ${dir}; fix the error above and rerun \`pnpm ${step}\` there.`);
          return 1;
        }
      }
    }

    printNextSteps(dir, scope, options.install, log);
    return 0;
  } catch (error) {
    log.error(errorMessage(error));
    return 1;
  }
}

function cancelled(log: Logger): number {
  log.info("Cancelled; nothing was created.");
  return 1;
}
