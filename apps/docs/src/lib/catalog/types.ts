/**
 * The shape of `src/generated/catalog.json`, produced at build time by
 * scripts/generate-catalog.ts from the registry's folder tree.
 *
 * Everything here is derived from files in the repo. There is no database:
 * what a team curates about a component (status, tags) lives in the
 * component's own package.json under a `registry` field, and what it says
 * about a scope lives in `registry/<scope>/scope.json`.
 */

export type ScopeVisibility = "public" | "private";

export interface CatalogScope {
  /** Folder name under registry/ and the npm scope, e.g. "acme" → @acme/*. */
  slug: string;
  name: string;
  tagline: string | null;
  /** Private scopes are reachable by URL but left out of the registry index. */
  visibility: ScopeVisibility;
  componentCount: number;
  /** Repo-relative path of a tokens.scss this scope declares, when it has one. */
  tokensPath: string | null;
}

/** Lifecycle of a component, as its package.json `registry.status` declares it. Defaults to STABLE. */
export type CatalogStatus = "DRAFT" | "BETA" | "STABLE" | "DEPRECATED";

export interface CatalogProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  description: string;
}

export interface CatalogDocComponent {
  displayName: string;
  description: string;
  props: CatalogProp[];
  /** The props interface also extends native HTML / Radix attributes, which are not listed. */
  extendsNative: boolean;
}

export interface CatalogExample {
  /** The composition's export name, e.g. "PrimaryButton". */
  name: string;
  /** "Primary Button". */
  title: string;
  /** JSDoc above the composition, when present. */
  description: string;
  /** Self-contained TSX for react-live's noInline mode — ends with `render(...)`. */
  code: string;
}

export interface CatalogSourceFile {
  path: string;
  language: "tsx" | "ts" | "scss" | "json" | "markdown";
  content: string;
}

export interface CatalogRelease {
  version: string;
  /** Markdown body of the CHANGELOG entry. */
  notes: string;
}

export interface CatalogComponent {
  scope: string;
  category: string;
  name: string;
  packageName: string;
  version: string;
  /** From the README's H1, falling back to the name in Title Case. */
  title: string;
  /** First prose paragraph of the README. */
  summary: string;
  /** README with the H1 removed. */
  readme: string;
  /** From package.json `registry.status`; STABLE when absent. */
  status: CatalogStatus;
  /** From package.json `registry.tags`; lower-cased, de-duplicated, at most 8. */
  tags: string[];
  docs: CatalogDocComponent[];
  examples: CatalogExample[];
  files: CatalogSourceFile[];
  releases: CatalogRelease[];
  /** Named exports of the built package, for the live sandbox's scope. */
  exportNames: string[];
  hasStyles: boolean;
  /** Repo-relative folder, e.g. "registry/acme/atoms/price-tag". */
  sourcePath: string;
  /** Workspace packages this one depends on, by package name. */
  dependencies: string[];
}

export interface CatalogTokens {
  colorRoles: { role: string; light: string; dark: string }[];
  typescale: { name: string; size: string; lineHeight: string; weight: string }[];
  shapes: { name: string; value: string }[];
}

/** Branding from registry.config.json, copied into the catalog so pages read one file. */
export interface CatalogSite {
  title: string;
  description: string | null;
  logo: string | null;
  primaryColor: string | null;
  links: { label: string; href: string }[];
}

export interface Catalog {
  generatedAt: string;
  /** The primary scope from registry.config.json. */
  primaryScope: string;
  /** Where `pnpm release` publishes, from registry.config.json. */
  npmRegistry: string;
  site: CatalogSite;
  categories: { key: string; label: string }[];
  scopes: CatalogScope[];
  components: CatalogComponent[];
  /** Null when no scope declares a tokens file; the Design tokens page is then hidden. */
  tokens: CatalogTokens | null;
}
