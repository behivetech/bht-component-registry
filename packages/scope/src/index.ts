/**
 * Naming rules for a scope.
 *
 * A scope is three things at once: the folder `registry/<scope>/`, the npm
 * scope `@<scope>/*` every component in it is published under, and the URL
 * path `/<scope>` on the docs site. One rule set, used by the generator, the
 * create/update CLI and the site, keeps the three from ever disagreeing.
 *
 * Pure functions with no framework imports on purpose, so they can run in a
 * CLI, a build script and the browser alike.
 */

/**
 * Names a scope can never take, because the docs site answers on them as
 * top-level routes, or because they would read as something else entirely in
 * a URL or an npm scope.
 */
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "docs",
  "sites",
  "scopes",
  "registry",
  "tokens",
  "sign-in",
  "sign-up",
  "onboarding",
  "static",
  "assets",
  "mail",
  "status",
  "node_modules",
  "npm",
  "pnpm",
  "example",
]);

/** Lowercase letters, digits and inner hyphens; 1–40 characters; the same rule npm applies to a scope name. */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export type SlugProblem = "empty" | "format" | "reserved";

/** Why a slug can't be a scope, or null when it can. */
export function slugProblem(slug: string): SlugProblem | null {
  if (!slug) return "empty";
  if (!SLUG_PATTERN.test(slug)) return "format";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return null;
}

export const isValidScope = (slug: string): boolean => slugProblem(slug) === null;
/** Kept for callers written against the platform's tenancy helpers. */
export const isValidTenantSlug = isValidScope;

/** A sentence a CLI or form can show for each problem. */
export function describeSlugProblem(slug: string, problem: SlugProblem): string {
  switch (problem) {
    case "empty":
      return "A scope is required: lowercase letters, digits and hyphens, e.g. acme for @acme/*.";
    case "format":
      return `"${slug}" is not a valid scope. Use lowercase letters, digits and hyphens, 1–40 characters, starting and ending with a letter or digit, e.g. acme → @acme/*.`;
    case "reserved":
      return `"${slug}" is reserved by the docs site and cannot be a scope.`;
  }
}

/** Lowercase, hyphenated, DNS-label-safe version of a display name. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** "bobs-burgers" → "Bobs Burgers", for a default site or scope title. */
export function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The npm package name for a component: `@<scope>/<category>.<name>`. */
export const packageNameFor = (scope: string, category: string, name: string): string => `@${scope}/${category}.${name}`;
