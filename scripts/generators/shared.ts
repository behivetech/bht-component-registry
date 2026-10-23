import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";
import {
  describeSlugProblem,
  slugProblem,
} from "../../packages/scope/src/index.ts";

/**
 * What the package generators (component, hook, util) have in common: the
 * repo's config, the scope prompt, the visibility prompt and the Handlebars
 * helpers the package.json templates read publishConfig through.
 *
 * A plain module, not a generator: the plopfile only loads folders with an
 * index.ts, so this is never offered in the `pnpm gen` list.
 */

// plop resolves a loaded generator's relative paths against the generator's
// own folder, so everything that names the repo is absolute from here.
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The component templates' tooling files, which hook and util packages share. */
export const COMPONENT_TEMPLATES = join(
  ROOT,
  "scripts/generators/component/templates",
);
export const SHARED_TOOLING_TEMPLATES = [
  "CHANGELOG.md.hbs",
  "eslint.config.mjs.hbs",
  "tsconfig.json.hbs",
  "tsup.config.ts.hbs",
].map((file) => join(COMPONENT_TEMPLATES, file));

export const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const DEFAULT_PUBLIC_REGISTRY = "https://registry.npmjs.org";

export interface RegistryConfig {
  scope?: string;
  npmRegistry?: string;
  privateRegistry?: string;
  site?: { url?: string };
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const readRegistryConfig = (): RegistryConfig =>
  readJson<RegistryConfig>(join(ROOT, "registry.config.json"), {});

export function repositoryUrl(): string {
  const rootPkg = readJson<{ repository?: { url?: string } | string }>(
    join(ROOT, "package.json"),
    {},
  );
  return typeof rootPkg.repository === "string"
    ? rootPkg.repository
    : (rootPkg.repository?.url ?? "");
}

/** Scopes that already exist in the registry, so the prompt can offer them. */
export function existingScopes(): string[] {
  const dir = join(ROOT, "registry");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

export function scopePrompt(config: RegistryConfig) {
  const scopes = existingScopes();
  return {
    type: "input" as const,
    name: "scope",
    message: "Scope — the owning npm scope, without the @ (e.g. acme)",
    suffix: scopes.length ? ` existing: ${scopes.join(", ")}` : "",
    default: config.scope ?? scopes[0],
    validate: (input: string) => {
      const problem = slugProblem(input);
      return problem ? describeSlugProblem(input, problem) : true;
    },
  };
}

/**
 * Where a package publishes is decided once. A public package goes to
 * npmRegistry with public access; a private one to privateRegistry with
 * restricted access. The guard (pnpm check:publish) refuses to let a
 * released package change its mind, so the prompt says so up front.
 */
export function visibilityPrompt(config: RegistryConfig) {
  const publicRegistry = config.npmRegistry ?? DEFAULT_PUBLIC_REGISTRY;
  const privateRegistry = config.privateRegistry;
  return {
    type: "list" as const,
    name: "visibility",
    message:
      "Visibility — permanent: a package cannot move between registries after its first release",
    choices: [
      {
        name: `public   — publishes to ${publicRegistry}; anyone can install it`,
        value: "public",
        short: "public",
      },
      {
        name: `private  — publishes to ${privateRegistry ?? "privateRegistry"}; needs a token to install`,
        value: "private",
        short: "private",
        // Inquirer shows a disabled choice with this text instead of letting it be picked.
        disabled: privateRegistry
          ? false
          : 'set "privateRegistry" in registry.config.json first',
      },
    ],
    default: "public",
  };
}

/**
 * The first action of every package generator. A disabled choice cannot be
 * picked interactively, but a bypassed answer can still say "private";
 * refuse it here (a thrown error fails the run) so a private package is
 * never written without somewhere to publish.
 */
export function checkVisibility(config: RegistryConfig) {
  const publicRegistry = config.npmRegistry ?? DEFAULT_PUBLIC_REGISTRY;
  return (answers: { visibility?: string }) => {
    if (answers.visibility === "private" && !config.privateRegistry) {
      throw new Error(
        '"privateRegistry" is not set in registry.config.json; a private package has nowhere to publish.',
      );
    }
    return answers.visibility === "private"
      ? `private → ${config.privateRegistry}`
      : `public → ${publicRegistry}`;
  };
}

/** `date-picker` → `Date Picker`: the README's H1, which the catalog uses as the title. plop's titleCase keeps the hyphen. */
export const titleWords = (slug: string) =>
  String(slug)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** The package.json templates read publishConfig through these, keyed by the visibility answer; READMEs use titleWords. */
export function registerPublishHelpers(
  plop: NodePlopAPI,
  config: RegistryConfig,
) {
  const publicRegistry = config.npmRegistry ?? DEFAULT_PUBLIC_REGISTRY;
  plop.setHelper("publishRegistry", (visibility: string) =>
    visibility === "private" ? config.privateRegistry : publicRegistry,
  );
  plop.setHelper("publishAccess", (visibility: string) =>
    visibility === "private" ? "restricted" : "public",
  );
  plop.setHelper("titleWords", titleWords);
  // The README's `Docs:` line, pointing npm readers at the package's page on
  // the docs site — only when registry.config.json#site.url is set. Ends with
  // a blank line so the template reads the same with or without it.
  plop.setHelper(
    "docsLine",
    (scope: string, category: string, name: string) => {
      const url = config.site?.url?.replace(/\/+$/, "");
      if (!url) return "";
      const slug = plop.getHelper("dashCase")(String(name));
      return `Docs: ${url}/${scope}/${category}/${slug}\n\n`;
    },
  );
  // The root class a scaffolded component starts from: `<prefix>__<PascalName>`.
  // A scope names its prefix in scope.json ("classPrefix": "BHT"); without one
  // it is the scope in CONSTANT_CASE (acme → ACME).
  plop.setHelper("classPrefix", (scope: string) => {
    const manifest = readJson<{ classPrefix?: string }>(
      join(ROOT, "registry", String(scope), "scope.json"),
      {},
    );
    return (
      manifest.classPrefix || plop.getHelper("constantCase")(String(scope))
    );
  });
}

/** `registry/<scope>/<category>/<name>` must not exist yet. */
export function refuseExisting(category: string) {
  return (input: string, answers?: { scope?: string }) => {
    const dest = join(
      ROOT,
      "registry",
      String(answers?.scope),
      category,
      input,
    );
    return existsSync(dest)
      ? `registry/${answers?.scope}/${category}/${input} already exists.`
      : true;
  };
}
