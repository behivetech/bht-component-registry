import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";
import {
  KEBAB,
  ROOT,
  SHARED_TOOLING_TEMPLATES,
  checkVisibility,
  readRegistryConfig,
  refuseExisting,
  registerPublishHelpers,
  repositoryUrl,
  scopePrompt,
  visibilityPrompt,
} from "../shared.ts";

/**
 * `pnpm gen util [<scope> <name> <visibility>]` — scaffold a utility package.
 *
 *   registry/<scope>/utils/<name>  →  @<scope>/utils.<name>
 *
 * Plain TypeScript, no React. Each exported function's signature and JSDoc
 * (`@param`, `@returns`, `@example`) become its docs; the `@example` blocks
 * are shown as code.
 */

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "templates");
const CATEGORY = "utils";

export default function (plop: NodePlopAPI) {
  const config = readRegistryConfig();
  registerPublishHelpers(plop, config);

  plop.setGenerator("util", {
    description: "A utility package: registry/<scope>/utils/<name> → @<scope>/utils.<name>",
    prompts: [
      scopePrompt(config),
      {
        type: "input",
        name: "name",
        message: (answers) => `Utility name (kebab-case, e.g. format-price) → registry/${answers.scope}/${CATEGORY}/<name>`,
        validate: (input: string, answers) => {
          if (!input) return "Utility name is required.";
          if (!KEBAB.test(input)) return `Must be kebab-case: "${input.toLowerCase().replace(/[^a-z0-9]+/g, "-")}" would do.`;
          return refuseExisting(CATEGORY)(input, answers);
        },
      },
      visibilityPrompt(config),
    ],
    actions: [
      checkVisibility(config),
      {
        type: "addMany",
        destination: join(ROOT, `registry/{{scope}}/${CATEGORY}/{{dashCase name}}`),
        base: TEMPLATES,
        templateFiles: join(TEMPLATES, "**"),
        globOptions: { dot: true },
        data: { category: CATEGORY, repositoryUrl: repositoryUrl() },
        verbose: true,
      },
      {
        type: "addMany",
        destination: join(ROOT, `registry/{{scope}}/${CATEGORY}/{{dashCase name}}`),
        base: dirname(SHARED_TOOLING_TEMPLATES[0]!),
        templateFiles: SHARED_TOOLING_TEMPLATES,
        data: { category: CATEGORY },
        verbose: true,
      },
      (answers) =>
        `Created @${answers.scope}/${CATEGORY}.${plop.getHelper("dashCase")(String(answers.name))} exporting ${plop.getHelper("camelCase")(String(answers.name))}.\n` +
        "Next: pnpm install (the catalog step links the new package into apps/docs), then pnpm dev.",
    ],
  });
}
