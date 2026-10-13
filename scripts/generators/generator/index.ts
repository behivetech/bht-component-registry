import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";

/**
 * `pnpm gen generator` — a skeleton for a generator of your own.
 *
 * Writes generators/<name>/index.ts (one prompt, an `add`, an `addMany` and
 * a custom action, each explained in place with a link to the plop page that
 * documents it) plus a first template. Run `pnpm gen` again and it is in the
 * list; `update` never touches generators/.
 */

// plop resolves a loaded generator's relative paths against the generator's
// own folder, so everything that names the repo is absolute from here.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const TEMPLATES = join(HERE, "templates");

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export default function (plop: NodePlopAPI) {
  plop.setGenerator("generator", {
    description: "A skeleton generator of your own, in generators/<name>/",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Generator name (kebab-case, e.g. hook, page, adr) → generators/<name>/",
        validate: (input: string) => {
          if (!KEBAB.test(input)) return "Must be kebab-case (e.g. hook, page, adr).";
          if (existsSync(join(ROOT, "generators", input))) return `generators/${input} already exists.`;
          if (existsSync(join(ROOT, "scripts", "generators", input))) return `"${input}" is a built-in generator; pick another name.`;
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "One line shown in the `pnpm gen` list (e.g. A React hook package)",
        validate: (input: string) => (input.trim() ? true : "A description is required; it is what the list shows."),
      },
    ],
    actions: [
      {
        type: "add",
        path: join(ROOT, "generators/{{dashCase name}}/index.ts"),
        templateFile: join(TEMPLATES, "index.ts.hbs"),
      },
      {
        // A template that renders to a template: the source is Handlebars
        // (its {{ }} are escaped as \{{ }}) and lands under the same name
        // as the first template of the new generator.
        type: "add",
        path: join(ROOT, "generators/{{dashCase name}}/templates/example.txt.hbs"),
        templateFile: join(TEMPLATES, "example.txt.hbs"),
      },
      (answers) => {
        const name = plop.getHelper("dashCase")(String(answers.name));
        return `Try it: pnpm gen ${name}\nThen open generators/${name}/index.ts and make it yours.`;
      },
    ],
  });
}
