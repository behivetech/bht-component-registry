import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePlopAPI } from "plop";

/**
 * `pnpm gen doc` — a Markdown page under docs/.
 *
 * docs/ is the owner's folder: `update` never touches it. The template's own
 * guide ships under apps/docs/default-docs/ (owned with the app), and a page
 * at the same relative path under docs/ takes its place — so a copy there is
 * how an owner makes a guide page theirs. Pages carry a little frontmatter
 * (title, description, section, order); a folder is a section, a file at the
 * top level sits in "General". Presets give a page a sensible starting body:
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

/** Where the template's default pages live; a same-path file under docs/ replaces one. */
const DEFAULT_DOCS = join(ROOT, "apps/docs/default-docs");

/** Sections that already exist: every folder directly under docs/ or the default pages. */
function existingSections(): string[] {
  const names = new Set<string>();
  for (const dir of [join(ROOT, "docs"), DEFAULT_DOCS]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) names.add(entry.name);
    }
  }
  return [...names].sort();
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
    description: "A Markdown page in docs/<section>/<slug>.md — yours; update never touches docs/",
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
      (answers) =>
        `Created docs/${plop.getHelper("docDir")(answers.section)}${plop.getHelper("dashCase")(String(answers.pageTitle))}.md — yours to edit; update never touches docs/.`,
    ],
  });
}
