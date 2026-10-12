import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

/**
 * `pnpm gen` — every generator in this registry, built on plop.
 *
 * Generators live in two places and are picked up automatically:
 *
 *   scripts/generators/<name>/   the template's own (component, doc, generator);
 *                                owned by the template, refreshed by `update`
 *   generators/<name>/           yours; never touched by `update`
 *
 * Each folder has an `index.ts` that exports `(plop) => plop.setGenerator(...)`
 * and, usually, a `templates/` folder of Handlebars files. `pnpm gen generator`
 * writes a working skeleton to start from. The API is plop's — see
 * https://plopjs.com/documentation/ for prompts, actions and helpers.
 */
export default async function (plop: NodePlopAPI) {
  plop.setWelcomeMessage("What would you like to generate?");

  const root = plop.getPlopfilePath();
  const folders = [join(root, "scripts", "generators"), join(root, "generators")];
  const entries = folders
    .filter((folder) => existsSync(folder))
    .flatMap((folder) =>
      readdirSync(folder, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => join(folder, entry.name, "index.ts"))
        .filter((file) => existsSync(file)),
    );

  await plop.load(entries);
}
