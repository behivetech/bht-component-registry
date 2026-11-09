import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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
 * contributing guidelines, coding standards, or nothing at all — or act on a
 * default page: `override` copies it into docs/ so your copy is shown instead
 * (the default keeps updating underneath for `git diff`), and `hide` writes a
 * stub whose frontmatter says `hidden: true`, which removes the default page
 * from the site. For those two the title names the default page's file:
 * "Publishing" → docs/guide/publishing.md over apps/docs/default-docs/guide/publishing.md.
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
  { name: "override      — your copy of a default guide page at the same path, shown instead of it", value: "override", short: "override" },
  { name: "hide          — a stub that removes a default guide page from the site", value: "hide", short: "hide" },
];
/** Presets that act on an existing default page rather than start a new one. */
const DEFAULT_PAGE_PRESETS = new Set(["override", "hide"]);

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
  /**
   * The description to write, or "" for none. `-` (or `none`) means none: pnpm
   * drops an empty positional argument, so `""` never reaches plop from the
   * command line, and the prompt's own default is empty anyway.
   */
  plop.setHelper("docDescription", (description: unknown) => {
    const raw = String(description ?? "").trim();
    return raw === "-" || raw.toLowerCase() === "none" ? "" : raw;
  });
  /** The folder part of the page path ("guide/"), or "" for a top-level page. */
  plop.setHelper("docDir", (section: unknown) => {
    const dir = plop.getHelper("docSection")(section);
    return dir ? `${dir}/` : "";
  });

  /** The default pages in a section, as slugs, for the message when override/hide names none. */
  const defaultSlugs = (dir: string) => {
    const folder = join(DEFAULT_DOCS, dir);
    return existsSync(folder)
      ? readdirSync(folder)
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, ""))
          .sort()
      : [];
  };

  plop.setGenerator("doc", {
    description:
      "A Markdown page in docs/<section>/<slug>.md — yours; update never touches docs/. Presets override or hide a default guide page too.",
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
        message: "One-line description (shown under the title in the nav; optional — `-` for none on the command line)",
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
        message: "Starting content (override and hide act on the default page the title names)",
        choices: PRESETS,
        default: "blank",
      },
    ],
    actions: (answers) => {
      const dir = plop.getHelper("docDir")(answers?.section) as string;
      const slug = plop.getHelper("dashCase")(String(answers?.pageTitle));
      const relative = `${dir}${slug}.md`;
      const target = join(ROOT, "docs", relative);
      const preset = String(answers?.preset);

      if (!DEFAULT_PAGE_PRESETS.has(preset)) {
        return [
          {
            type: "add",
            path: target,
            templateFile: join(TEMPLATES, `${preset}.md.hbs`),
          },
          () => `Created docs/${relative} — yours to edit; update never touches docs/.`,
        ];
      }

      // override / hide: the page must be one the template ships, at the same path.
      const source = join(DEFAULT_DOCS, relative);
      if (!existsSync(source)) {
        const known = defaultSlugs(dir);
        throw new Error(
          `No default page at apps/docs/default-docs/${relative} to ${preset}. ` +
            (known.length
              ? `Default pages in "${dir || "the top level"}": ${known.join(", ")}. Give one of those as the title (the file name, e.g. "hooks-and-utils").`
              : `There are no default pages in "${dir || "the top level"}"; a section with defaults is "guide".`),
        );
      }
      if (preset === "hide") {
        return [
          { type: "add", path: target, templateFile: join(TEMPLATES, "hide.md.hbs") },
          () => `Created docs/${relative} with hidden: true — the default page is off the site. Delete the file to bring it back.`,
        ];
      }
      return [
        // A byte-for-byte copy, not a rendered template: the default pages are
        // Markdown with their own braces (the generators guide shows Handlebars).
        () => {
          if (existsSync(target)) throw new Error(`docs/${relative} already exists.`);
          mkdirSync(join(ROOT, "docs", dir), { recursive: true });
          copyFileSync(source, target);
          return `Copied apps/docs/default-docs/${relative} → docs/${relative}`;
        },
        () =>
          `docs/${relative} is now shown instead of the default. Edit it freely; \`git diff --no-index apps/docs/default-docs/${relative} docs/${relative}\` shows what the template changes later.`,
      ];
    },
  });
}
