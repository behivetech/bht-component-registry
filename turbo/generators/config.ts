import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PlopTypes } from "@turbo/gen";
import { describeSlugProblem, slugProblem } from "../../packages/scope/src/index";

/**
 * `pnpm gen` — scaffold a new component package into the registry.
 *
 * The registry's folder tree is its ownership model:
 *
 *   registry/<scope>/<category>/<name>  →  @<scope>/<category>.<name>
 *
 * The scope defaults to the primary scope in registry.config.json, and the
 * package's publish target comes from the same file, so a generated package
 * is publishable with no edits. Everything the site later shows for the
 * component — owner, docs, versions, status — derives from the files this
 * writes.
 */

const CATEGORIES = [
  { name: "atoms     — Basic building blocks (button, badge, text-field)", value: "atoms" },
  { name: "molecules — Composed from atoms (empty-state, confirm-dialog)", value: "molecules" },
  { name: "forms     — Form orchestration (form-field, form provider)", value: "forms" },
  { name: "organisms — Complex sections (hero-banner, header)", value: "organisms" },
  { name: "templates — Page layouts (sidebar-layout, page)", value: "templates" },
];

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Repo root, resolved from this file rather than the working directory — `turbo gen` can be invoked from any package. */
function repoRoot(plop: PlopTypes.NodePlopAPI): string {
  return resolve(plop.getPlopfilePath(), "../..");
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Scopes that already exist in the registry, so the prompt can offer them. */
function existingScopes(plop: PlopTypes.NodePlopAPI): string[] {
  const dir = join(repoRoot(plop), "registry");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  const root = repoRoot(plop);
  const config = readJson<{ scope?: string; npmRegistry?: string }>(join(root, "registry.config.json"), {});
  const rootPkg = readJson<{ repository?: { url?: string } | string }>(join(root, "package.json"), {});
  const repositoryUrl = typeof rootPkg.repository === "string" ? rootPkg.repository : (rootPkg.repository?.url ?? "");
  const scopes = existingScopes(plop);

  plop.setGenerator("component", {
    description: "Create a new component package in registry/<scope>/<category>/<name>",
    prompts: [
      {
        type: "input",
        name: "scope",
        message: `Scope — the owning npm scope, without the @ (existing: ${scopes.join(", ") || "none yet"}):`,
        default: config.scope ?? scopes[0],
        validate: (input: string) => {
          const problem = slugProblem(input);
          return problem ? describeSlugProblem(input, problem) : true;
        },
      },
      {
        type: "list",
        name: "category",
        message: "Component category:",
        choices: CATEGORIES,
      },
      {
        type: "input",
        name: "name",
        message: "Component name (kebab-case, e.g. accordion, date-picker):",
        validate: (input: string) => {
          if (!input) return "Component name is required";
          if (!KEBAB.test(input)) return "Must be kebab-case (e.g. accordion, date-picker)";
          return true;
        },
      },
    ],
    actions: (answers) => {
      // `--args` bypasses the prompts' validate(), so check again here: an
      // unscoped or reserved name must never reach the file system.
      const data = (answers ?? {}) as { scope?: string; name?: string; category?: string };
      const problem = slugProblem(data.scope ?? "");
      if (problem) throw new Error(describeSlugProblem(data.scope ?? "", problem));
      if (!data.name || !KEBAB.test(data.name)) throw new Error("Component name must be kebab-case (e.g. accordion, date-picker)");
      // Values the templates need that nobody should be asked for.
      Object.assign(data, {
        npmRegistry: config.npmRegistry ?? "https://registry.npmjs.org",
        repositoryUrl,
      });
      return [
        {
          type: "addMany",
          destination: "{{ turbo.paths.root }}/registry/{{ scope }}/{{ category }}/{{ dashCase name }}",
          base: "templates/component",
          templateFiles: "templates/component/**/*.hbs",
          stripExtensions: ["hbs"],
        },
      ];
    },
  });
}
