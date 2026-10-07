import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import prompts from "prompts";
import { describeSlugProblem, slugProblem, titleCase } from "../packages/scope/src/index.ts";

/**
 * `pnpm gen [--args <scope> <category> <name>]` — scaffold a component package.
 *
 * The registry's folder tree is its ownership model:
 *
 *   registry/<scope>/<category>/<name>  →  @<scope>/<category>.<name>
 *
 * Renders scripts/templates/component/**\/*.hbs (file names included) with
 * Handlebars. The scope defaults to registry.config.json#scope and the
 * package's publish target comes from the same file, so a generated package
 * is publishable with no edits. Everything the site later shows for the
 * component — owner, docs, versions, status — derives from the files this
 * writes.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(ROOT, "scripts", "templates", "component");

const CATEGORIES = [
  { title: "atoms     — Basic building blocks (button, badge, text-field)", value: "atoms" },
  { title: "molecules — Composed from atoms (empty-state, confirm-dialog)", value: "molecules" },
  { title: "forms     — Form orchestration (form-field, form provider)", value: "forms" },
  { title: "organisms — Complex sections (hero-banner, header)", value: "organisms" },
  { title: "templates — Page layouts (sidebar-layout, page)", value: "templates" },
];

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Inputs are validated slugs, so splitting on "-" is the whole job.
const words = (slug: string) => slug.split("-").filter(Boolean);
const dashCase = (slug: string) => words(slug).join("-");
const pascalCase = (slug: string) =>
  words(slug)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("");
const constantCase = (slug: string) => words(slug).join("_").toUpperCase();
Handlebars.registerHelper({ dashCase, pascalCase, constantCase, titleCase });

type Data = Record<string, string>;
const render = (template: string, data: Data) => Handlebars.compile(template, { noEscape: true })(data);

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

/** Template files relative to TEMPLATE_DIR, recursively. */
function templateFiles(dir = TEMPLATE_DIR, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? templateFiles(join(dir, entry.name), join(prefix, entry.name)) : [join(prefix, entry.name)],
    )
    .sort();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const config = readJson<{ scope?: string; npmRegistry?: string }>(join(ROOT, "registry.config.json"), {});
  const rootPkg = readJson<{ repository?: { url?: string } | string }>(join(ROOT, "package.json"), {});
  const repositoryUrl = typeof rootPkg.repository === "string" ? rootPkg.repository : (rootPkg.repository?.url ?? "");
  const scopes = existingScopes();

  // `pnpm gen --args acme atoms button` (or just `pnpm gen acme atoms button`).
  const [argScope, argCategory, argName] = process.argv.slice(2).filter((arg) => arg !== "--args" && arg !== "--");

  const answers = await prompts(
    [
      {
        type: argScope ? null : "text",
        name: "scope",
        message: `Scope — the owning npm scope, without the @ (existing: ${scopes.join(", ") || "none yet"}):`,
        initial: config.scope ?? scopes[0],
        validate: (input: string) => {
          const problem = slugProblem(input);
          return problem ? describeSlugProblem(input, problem) : true;
        },
      },
      {
        type: argCategory ? null : "select",
        name: "category",
        message: "Component category:",
        choices: CATEGORIES,
      },
      {
        type: argName ? null : "text",
        name: "name",
        message: "Component name (kebab-case, e.g. accordion, date-picker):",
        validate: (input: string) =>
          !input ? "Component name is required" : KEBAB.test(input) ? true : "Must be kebab-case (e.g. accordion, date-picker)",
      },
    ],
    { onCancel: () => fail("Cancelled.") },
  );

  const scope = String(argScope ?? answers.scope ?? "");
  const category = String(argCategory ?? answers.category ?? "");
  const name = String(argName ?? answers.name ?? "");

  // Arguments bypass the prompts' validate(), so check again here: an
  // unscoped or reserved name must never reach the file system.
  const problem = slugProblem(scope);
  if (problem) fail(describeSlugProblem(scope, problem));
  if (!CATEGORIES.some((c) => c.value === category)) {
    fail(`Unknown category "${category}". One of: ${CATEGORIES.map((c) => c.value).join(", ")}.`);
  }
  if (!KEBAB.test(name)) fail("Component name must be kebab-case (e.g. accordion, date-picker).");

  const dest = join(ROOT, "registry", scope, category, dashCase(name));
  if (existsSync(dest)) fail(`${relative(ROOT, dest)} already exists.`);

  const data: Data = {
    scope,
    category,
    name,
    npmRegistry: config.npmRegistry ?? "https://registry.npmjs.org",
    repositoryUrl,
  };

  for (const file of templateFiles()) {
    const out = join(dest, render(file, data).replace(/\.hbs$/, ""));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, render(readFileSync(join(TEMPLATE_DIR, file), "utf8"), data));
    console.log(`+ ${relative(ROOT, out)}`);
  }

  console.log(`\nCreated @${scope}/${category}.${dashCase(name)} in ${relative(ROOT, dest)}.`);
  console.log("Next: pnpm install (the catalog step links the new package into apps/docs), then pnpm dev.");
}

await main();
