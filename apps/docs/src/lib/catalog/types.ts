import type { ResolvedHero } from "../branding";
import type { ThemeSeeds } from "../theme/scheme";

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

export interface CatalogDocParam {
  name: string;
  type: string;
  optional: boolean;
  /** The parameter's default as written in the source, or null. */
  defaultValue: string | null;
  /** The `@param` text, if any. */
  description: string;
}

export interface CatalogDocSignature {
  /** `useToggle(initial?: boolean): [boolean, () => void]` */
  text: string;
  params: CatalogDocParam[];
  returns: { type: string; description: string };
}

/** An exported hook (`useX`) or utility function, read from its TypeScript and JSDoc. */
export interface CatalogDocFunction {
  name: string;
  kind: "hook" | "function";
  description: string;
  signatures: CatalogDocSignature[];
  /** The `@example` blocks, as code. */
  examples: string[];
}

export interface CatalogExample {
  /** The example's export name, e.g. "PrimaryButton". */
  name: string;
  /** "Primary Button". */
  title: string;
  /** JSDoc above the example, when present. */
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
  /** From package.json `registry.design`: where this component's design lives. */
  design: CatalogDesignLink[];
  /**
   * From package.json `registry.preview.thumbnail`; true unless set to false.
   * False keeps the component off its catalog tile — for anything that opens
   * as an overlay and so has nothing to show in a tile.
   */
  thumbnail: boolean;
  docs: CatalogDocComponent[];
  /** Exported hooks and utility functions, with signatures and examples. */
  functions: CatalogDocFunction[];
  examples: CatalogExample[];
  files: CatalogSourceFile[];
  releases: CatalogRelease[];
  /** Named exports of the built package, for the live sandbox's scope. */
  exportNames: string[];
  hasStyles: boolean;
  /** `publishConfig.registry`, where this package's releases go and where the Changelog tab looks them up. */
  publishRegistry: string;
  /** Private: publishes to `privateRegistry` with restricted access, so installing needs a token. */
  visibility: "public" | "private";
  /** Repo-relative folder, e.g. "registry/acme/atoms/price-tag". */
  sourcePath: string;
  /** Versions with a docs snapshot under docs-history/, newest first; each has a page at /v/<version>. */
  versions: string[];
  /** Workspace packages this one depends on, by package name. */
  dependencies: string[];
}

export interface CatalogTokens {
  /** Repo-relative path of the sheet the scope declared. */
  path: string;
  /** The npm package the sheet ships in (the nearest package.json above it), for install instructions; null outside a package. */
  packageName: string | null;
  colorRoles: { role: string; light: string; dark: string }[];
  typescale: {
    name: string;
    size: string;
    lineHeight: string;
    weight: string;
  }[];
  shapes: { name: string; value: string }[];
}

/** Branding from registry.config.json, copied into the catalog so pages read one file. */
/** A link from a component (or the registry) to its design: a Figma frame, a Penpot file, a PDF — any URL. */
export interface CatalogDesignLink {
  label: string;
  url: string;
  /** Figma URLs are recognised and can be embedded; anything else is a link card. */
  kind: "figma" | "link";
  /** Figma Embed Kit URL for the file/frame, when `kind` is figma. */
  embedUrl: string | null;
}

export interface CatalogSite {
  title: string;
  description: string | null;
  /** Header logo URL (from branding/, an absolute URL, or the legacy public/ path); null shows the title as text. */
  logo: string | null;
  /** A logo for dark surfaces; falls back to `logo`. */
  logoDark: string | null;
  /** `<link rel="icon">`; null keeps the app's default /favicon.ico. */
  favicon: string | null;
  icons: { apple: string | null; png192: string | null; png512: string | null };
  /** `<meta name="theme-color">`; defaults to the theme's primary seed. */
  themeColor: string | null;
  /** "dark" renders the header on the dark scheme's surface in both colour schemes (for a light wordmark). */
  headerTheme: "light" | "dark";
  /** The seeds src/generated/theme.css was built from; null when the token sheet's palette stands. */
  theme: ThemeSeeds | null;
  /** Configured font families per slot, for display; the faces themselves load through src/generated/fonts.ts. */
  fonts: { body: string | null; heading: string | null };
  hero: ResolvedHero;
  links: { label: string; href: string }[];
  /** Show Figma links as embedded frames (a third-party iframe; the file must be visible to the viewer). Off by default. */
  embedDesigns: boolean;
  /** The design-system file, from registry.config.json#site.design; linked from the tokens page. */
  design: CatalogDesignLink | null;
}

/**
 * One page of the site's Docs section: a Markdown file under docs/ (the
 * owner's) or apps/docs/default-docs/ (the template's), the owner's winning
 * when both have the same relative path.
 */
export interface DocPage {
  /** URL path under /docs, e.g. "guide/publishing" or "contributing". */
  slug: string;
  /** Repo-relative file the page came from: "docs/…" or "apps/docs/default-docs/…". */
  path: string;
  /** The folder under docs/, or "general" for a top-level page. */
  section: string;
  sectionLabel: string;
  title: string;
  description: string | null;
  /** Position within its section; frontmatter `order`, 100 when absent. */
  order: number;
  /** Markdown with the H1 removed. */
  body: string;
}

export interface DocsIndex {
  pages: DocPage[];
}

/**
 * One component at one released version: what docs-history/<…>/<version>/
 * holds, parsed the same way as the live component. No live examples (only
 * the current build exists), no export names, no sandbox.
 */
export interface HistoryEntry {
  version: string;
  /** ISO date the snapshot was written. */
  date: string;
  title: string;
  summary: string;
  readme: string;
  status: CatalogStatus;
  tags: string[];
  docs: CatalogDocComponent[];
  functions: CatalogDocFunction[];
  examples: CatalogExample[];
  files: CatalogSourceFile[];
  /** The live CHANGELOG sliced at this version. */
  releases: CatalogRelease[];
}

/** src/generated/history.json: package name → its snapshots, newest first. */
export type HistoryIndex = Record<string, HistoryEntry[]>;

/** Docs-site behaviour from registry.config.json#docs, with defaults applied. */
export interface CatalogDocsConfig {
  history: {
    enabled: boolean;
    /** How many snapshots per component the site keeps: every one, the last N, or one per older major. */
    keep: "all" | "majors" | number;
  };
  /** Whether the /theme builder page and its header link are built. */
  themeBuilder: boolean;
}

export interface Catalog {
  generatedAt: string;
  /** The primary scope from registry.config.json. */
  primaryScope: string;
  /** Where public packages publish, from registry.config.json. */
  npmRegistry: string;
  /** Where private packages publish, from registry.config.json; null when the registry has none. */
  privateRegistry: string | null;
  site: CatalogSite;
  docs: CatalogDocsConfig;
  categories: { key: string; label: string }[];
  scopes: CatalogScope[];
  components: CatalogComponent[];
  /** Null when no scope declares a tokens file; the Design tokens page is then hidden. */
  tokens: CatalogTokens | null;
}
