import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";
import { describeSlugProblem, slugProblem } from "../../../packages/scope/src/index.ts";

/**
 * `pnpm gen component [<scope> <category> <name>]` — scaffold a component package.
 *
 * The registry's folder tree is its ownership model:
 *
 *   registry/<scope>/<category>/<name>  →  @<scope>/<category>.<name>
 *
 * Renders templates/**\/*.hbs (file names included). The scope defaults to
 * registry.config.json#scope and the package's publish target comes from the
 * same file, so a generated package is publishable with no edits. Everything
 * the site later shows for the component — owner, docs, versions, status —
 * derives from the files this writes.
 */

// plop resolves a loaded generator's relative paths against the generator's
// own folder, so everything that names the repo is absolute from here.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const TEMPLATES = join(HERE, "templates");

const CATEGORIES = [
  { name: "atoms      — basic building blocks (button, badge, text-field)", value: "atoms", short: "atoms" },
  { name: "molecules  — composed from atoms (empty-state, confirm-dialog)", value: "molecules", short: "molecules" },
  { name: "forms      — form orchestration (form-field, form provider)", value: "forms", short: "forms" },
  { name: "organisms  — complex sections (hero-banner, header)", value: "organisms", short: "organisms" },
  { name: "templates  — page layouts (sidebar-layout, page)", value: "templates", short: "templates" },
];

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const DEFAULT_PUBLIC_REGISTRY = "https://registry.npmjs.org";

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Scopes that already exist in the registry, so the prompt can offer them. */
function existingScopes(): string[] {
  const dir = join(ROOT, "registry");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

export default function (plop: NodePlopAPI) {
  const config = readJson<{ scope?: string; npmRegistry?: string; privateRegistry?: string }>(
    join(ROOT, "registry.config.json"),
    {},
  );
  const rootPkg = readJson<{ repository?: { url?: string } | string }>(join(ROOT, "package.json"), {});
  const repositoryUrl = typeof rootPkg.repository === "string" ? rootPkg.repository : (rootPkg.repository?.url ?? "");
  const scopes = existingScopes();
  const publicRegistry = config.npmRegistry ?? DEFAULT_PUBLIC_REGISTRY;
  const privateRegistry = config.privateRegistry;

  // Where a package publishes is decided once. A public package goes to
  // npmRegistry with public access; a private one to privateRegistry with
  // restricted access. The guard (pnpm check:publish) refuses to let a
  // released package change its mind, so the prompt says so up front.
  const VISIBILITY = [
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
      disabled: privateRegistry ? false : 'set "privateRegistry" in registry.config.json first',
    },
  ];
  // The template reads publishConfig through these, keyed by the answer.
  plop.setHelper("publishRegistry", (visibility: string) => (visibility === "private" ? privateRegistry : publicRegistry));
  plop.setHelper("publishAccess", (visibility: string) => (visibility === "private" ? "restricted" : "public"));

  plop.setGenerator("component", {
    description: "A component package: registry/<scope>/<category>/<name> → @<scope>/<category>.<name>",
    prompts: [
      {
        type: "input",
        name: "scope",
        message: "Scope — the owning npm scope, without the @ (e.g. acme)",
        suffix: scopes.length ? ` existing: ${scopes.join(", ")}` : "",
        default: config.scope ?? scopes[0],
        validate: (input: string) => {
          const problem = slugProblem(input);
          return problem ? describeSlugProblem(input, problem) : true;
        },
      },
      {
        type: "list",
        name: "category",
        message: "Category",
        choices: CATEGORIES,
        default: "atoms",
      },
      {
        type: "input",
        name: "name",
        message: (answers) => `Component name (kebab-case, e.g. date-picker) → registry/${answers.scope}/${answers.category}/<name>`,
        validate: (input: string, answers) => {
          if (!input) return "Component name is required.";
          if (!KEBAB.test(input)) return `Must be kebab-case: "${input.toLowerCase().replace(/[^a-z0-9]+/g, "-")}" would do.`;
          const dest = join(ROOT, "registry", String(answers?.scope), String(answers?.category), input);
          return existsSync(dest) ? `registry/${answers?.scope}/${answers?.category}/${input} already exists.` : true;
        },
      },
      {
        type: "list",
        name: "visibility",
        message: "Visibility — permanent: a package cannot move between registries after its first release",
        choices: VISIBILITY,
        default: "public",
      },
    ],
    actions: [
      (answers) => {
        // A disabled choice cannot be picked interactively, but a bypassed
        // answer can still say "private"; refuse it here (a thrown error fails
        // the run) so a private package is never written without somewhere
        // to publish.
        if (answers.visibility === "private" && !privateRegistry) {
          throw new Error('"privateRegistry" is not set in registry.config.json; a private package has nowhere to publish.');
        }
        return answers.visibility === "private" ? `private → ${privateRegistry}` : `public → ${publicRegistry}`;
      },
      {
        type: "addMany",
        destination: join(ROOT, "registry/{{scope}}/{{category}}/{{dashCase name}}"),
        base: TEMPLATES,
        templateFiles: join(TEMPLATES, "**"),
        globOptions: { dot: true },
        data: { repositoryUrl },
        verbose: true,
      },
      (answers) =>
        `Created @${answers.scope}/${answers.category}.${plop.getHelper("dashCase")(String(answers.name))}.\n` +
        "Next: pnpm install (the catalog step links the new package into apps/docs), then pnpm dev.",
    ],
  });
}
