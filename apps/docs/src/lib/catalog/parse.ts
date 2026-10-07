import type { CatalogRelease } from "./types";

/** "hero-banner" → "Hero Banner". */
export const toTitle = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");

/** "PrimaryButton" → "Primary Button". */
export const splitPascal = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

/** The README's H1 text, if it has one. */
export function readmeTitle(readme: string): string | null {
  return readme.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;
}

/**
 * A display title from a README heading: a component name written in
 * PascalCase ("PriceTag", "HeroBanner") reads as words; anything with spaces
 * or lowercase is left exactly as the author wrote it.
 */
export function humanizeTitle(title: string): string {
  return /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+$/.test(title) ? splitPascal(title) : title;
}

/** README without its H1 — the page renders the title itself. */
export const stripTitle = (readme: string) => readme.replace(/^#\s+.*\r?\n/, "").trim();

/** First prose paragraph after the README's H1, on one line — the component's summary. */
export function readmeSummary(readme: string): string {
  const paragraphs = stripTitle(readme)
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !p.startsWith("<!--") && !p.startsWith("|") && !p.startsWith("-"));
  return paragraphs[0]?.replace(/\s+/g, " ") ?? "";
}

/**
 * Splits a Changesets-style CHANGELOG into releases, newest first, as the
 * file lists them. A file with only the package-name heading yields nothing.
 */
export function parseChangelog(markdown: string): CatalogRelease[] {
  const releases: CatalogRelease[] = [];
  const sections = markdown.split(/^##\s+/m).slice(1);
  for (const section of sections) {
    const newline = section.indexOf("\n");
    const version = (newline === -1 ? section : section.slice(0, newline)).trim();
    if (!/^\d+\.\d+\.\d+/.test(version)) continue;
    releases.push({ version, notes: newline === -1 ? "" : section.slice(newline + 1).trim() });
  }
  return releases;
}

/**
 * MD3 token groups pulled out of the theme's tokens.scss, for the tokens page.
 *
 * Reads three blocks by their selectors: the first `:root { … }` (light
 * scheme), and `:root[data-theme="dark"] { … }` (forced dark). Anything not
 * matching those patterns is ignored, so a reorganised sheet degrades to
 * fewer swatches rather than a broken build.
 */
export function extractTokens(scss: string) {
  const block = (start: number) => {
    if (start === -1) return "";
    const open = scss.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < scss.length; i += 1) {
      if (scss[i] === "{") depth += 1;
      if (scss[i] === "}") {
        depth -= 1;
        if (depth === 0) return scss.slice(open, i);
      }
    }
    return scss.slice(open);
  };
  const vars = (text: string) =>
    Object.fromEntries(
      [...text.matchAll(/(--md-sys-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
    ) as Record<string, string>;

  const light = vars(block(scss.indexOf(":root {")));
  const dark = vars(block(scss.indexOf(':root[data-theme="dark"]')));

  const colorRoles = Object.keys(light)
    .filter((key) => key.startsWith("--md-sys-color-"))
    .map((key) => ({ role: key.replace("--md-sys-color-", ""), light: light[key]!, dark: dark[key] ?? "" }));

  const typescale = [
    ...new Set(
      Object.keys(light)
        .map((key) => key.match(/^--md-sys-typescale-([a-z]+-(?:large|medium|small))-size$/)?.[1])
        .filter((name): name is string => Boolean(name)),
    ),
  ].map((name) => ({
    name,
    size: light[`--md-sys-typescale-${name}-size`] ?? "",
    lineHeight: light[`--md-sys-typescale-${name}-line-height`] ?? "",
    weight: light[`--md-sys-typescale-${name}-weight`] ?? "",
  }));

  const shapes = Object.keys(light)
    .filter((key) => key.startsWith("--md-sys-shape-corner-"))
    .map((key) => ({ name: key.replace("--md-sys-shape-corner-", ""), value: light[key]! }));

  return { colorRoles, typescale, shapes };
}
