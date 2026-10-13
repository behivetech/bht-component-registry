import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";
import {
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
 * `pnpm gen hook [<scope> <name> <visibility>]` — scaffold a React hook package.
 *
 *   registry/<scope>/hooks/<name>  →  @<scope>/hooks.<name>
 *
 * The hook's TypeScript signature and JSDoc (`@param`, `@returns`,
 * `@example`) become its docs; a composition — a small component that uses
 * the hook — is its live example, the same way a component's is.
 */

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "templates");
const CATEGORY = "hooks";
const HOOK_NAME = /^use-[a-z0-9]+(-[a-z0-9]+)*$/;

export default function (plop: NodePlopAPI) {
  const config = readRegistryConfig();
  registerPublishHelpers(plop, config);

  plop.setGenerator("hook", {
    description: "A React hook package: registry/<scope>/hooks/<name> → @<scope>/hooks.<name>",
    prompts: [
      scopePrompt(config),
      {
        type: "input",
        name: "name",
        message: (answers) => `Hook name (kebab-case, starting with use-, e.g. use-toggle) → registry/${answers.scope}/${CATEGORY}/<name>`,
        validate: (input: string, answers) => {
          if (!input) return "Hook name is required.";
          if (!HOOK_NAME.test(input)) return `Must be kebab-case and start with use-: "use-${input.toLowerCase().replace(/^use-?/, "").replace(/[^a-z0-9]+/g, "-")}" would do.`;
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
