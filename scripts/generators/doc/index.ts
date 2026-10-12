import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";

/**
 * `pnpm gen doc` — a page for the site's Docs section.
 *
 * Pages are Markdown files under docs/ with a little frontmatter (title,
 * description, section, order). A folder is a section; a file at the top
 * level sits in "General". Presets give a page a sensible starting body:
 * contributing guidelines, coding standards, or nothing at all.
 */

// plop resolves a loaded generator's relative paths against the generator's
// own folder, so everything that names the repo is absolute from here.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const TEMPLATES = join(HERE, "templates");

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** What to answer for "section" to get a top-level page (an empty answer works interactively; "." works everywhere). */
const TOP_LEVEL = ".";

const PRESETS = [
  { name: "blank         — a title and a first paragraph", value: "blank", short: "blank" },
  { name: "contributing  — how to propose, build and release a component here", value: "contributing", short: "contributing" },
  { name: "standards     — naming, props, styling and testing rules, with a live example", value: "standards", short: "standards" },
];

/** Sections that already exist: every folder directly under docs/. */
function existingSections(): string[] {
  const dir = join(ROOT, "docs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

export default function (plop: NodePlopAPI) {
  const sections = existingSections();

  /** The section's folder name ("guide"), or "" for a top-level page. */
  plop.setHelper("docSection", (section: unknown) => {
    const raw = String(section ?? "").trim();
    return !raw || raw === TOP_LEVEL ? "" : plop.getHelper("dashCase")(raw);
  });
  /** The folder part of the page path ("guide/"), or "" for a top-level page. */
  plop.setHelper("docDir", (section: unknown) => {
    const dir = plop.getHelper("docSection")(section);
    return dir ? `${dir}/` : "";
  });

  plop.setGenerator("doc", {
    description: "A Markdown page for the Docs section (docs/<section>/<slug>.md)",
    // One plain input for the section rather than a list with a "new…" branch:
    // plop cannot bypass a conditional prompt, and a page should be scriptable.
    prompts: [
      {
        type: "input",
        name: "section",
        message: "Section — a folder under docs/ (kebab-case, new or existing; blank or . for a top-level page)",
        suffix: sections.length ? ` existing: ${sections.join(", ")}` : "",
        default: sections[0] ?? "",
        validate: (input: string) => {
          const raw = input.trim();
          if (!raw || raw === TOP_LEVEL || KEBAB.test(raw)) return true;
          return `Must be kebab-case (e.g. guide, how-we-work), or blank for a top-level page.`;
        },
      },
      {
        type: "input",
        name: "pageTitle",
        message: (answers) => `Page title (e.g. Contributing) → docs/${plop.getHelper("docDir")(answers.section)}<slug>.md`,
        validate: (input: string, answers) => {
          if (!input.trim()) return "A title is required; the file name comes from it.";
          const dir = plop.getHelper("docDir")(answers?.section);
          const slug = plop.getHelper("dashCase")(input);
          return existsSync(join(ROOT, "docs", `${dir}${slug}.md`)) ? `docs/${dir}${slug}.md already exists.` : true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "One-line description (shown under the title in the nav; optional)",
        default: "",
      },
      {
        type: "number",
        name: "order",
        message: "Order within the section (lower first)",
        default: 10,
      },
      {
        type: "list",
        name: "preset",
        message: "Starting content",
        choices: PRESETS,
        default: "blank",
      },
    ],
    actions: [
      {
        type: "add",
        path: join(ROOT, "docs/{{docDir section}}{{dashCase pageTitle}}.md"),
        templateFile: join(TEMPLATES, "{{preset}}.md.hbs"),
      },
      () => "Edit the page, then pnpm dev — it appears in the Docs section on the next build.",
    ],
  });
}
