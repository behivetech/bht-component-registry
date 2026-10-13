import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";
import {
  KEBAB,
  ROOT,
  checkVisibility,
  readRegistryConfig,
  refuseExisting,
  registerPublishHelpers,
  repositoryUrl,
  scopePrompt,
  visibilityPrompt,
} from "../shared.ts";

/**
 * `pnpm gen component [<scope> <category> <name> <visibility>]` — scaffold a component package.
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

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "templates");

const CATEGORIES = [
  { name: "atoms      — basic building blocks (button, badge, text-field)", value: "atoms", short: "atoms" },
  { name: "molecules  — composed from atoms (empty-state, confirm-dialog)", value: "molecules", short: "molecules" },
  { name: "forms      — form orchestration (form-field, form provider)", value: "forms", short: "forms" },
  { name: "organisms  — complex sections (hero-banner, header)", value: "organisms", short: "organisms" },
  { name: "templates  — page layouts (sidebar-layout, page)", value: "templates", short: "templates" },
];

export default function (plop: NodePlopAPI) {
  const config = readRegistryConfig();
  registerPublishHelpers(plop, config);

  plop.setGenerator("component", {
    description: "A component package: registry/<scope>/<category>/<name> → @<scope>/<category>.<name>",
    prompts: [
      scopePrompt(config),
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
          return refuseExisting(String(answers?.category))(input, answers);
        },
      },
      visibilityPrompt(config),
    ],
    actions: [
      checkVisibility(config),
      {
        type: "addMany",
        destination: join(ROOT, "registry/{{scope}}/{{category}}/{{dashCase name}}"),
        base: TEMPLATES,
        templateFiles: join(TEMPLATES, "**"),
        globOptions: { dot: true },
        data: { repositoryUrl: repositoryUrl() },
        verbose: true,
      },
      (answers) =>
        `Created @${answers.scope}/${answers.category}.${plop.getHelper("dashCase")(String(answers.name))}.\n` +
        "Next: pnpm install (the catalog step links the new package into apps/docs), then pnpm dev.",
    ],
  });
}
