import catalogJson from "@/generated/catalog.json";
import type { Catalog, CatalogComponent, CatalogScope } from "./types";

export type * from "./types";

/**
 * Read access to the build-time catalog. Importing the JSON statically means
 * every consumer — pages, generateStaticParams, the sandbox scope — sees the
 * same snapshot, and the bundler can tree-shake nothing out from under it.
 */
export const catalog = catalogJson as Catalog;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  catalog.categories.map((c) => [c.key, c.label]),
);

export const getScopes = (includePrivate = false): CatalogScope[] =>
  catalog.scopes.filter((scope) => includePrivate || scope.visibility === "public");

export const getScope = (slug: string): CatalogScope | undefined =>
  catalog.scopes.find((scope) => scope.slug === slug);

export const getComponents = (scope?: string): CatalogComponent[] =>
  scope ? catalog.components.filter((c) => c.scope === scope) : catalog.components;

export const getComponent = (scope: string, category: string, name: string): CatalogComponent | undefined =>
  catalog.components.find((c) => c.scope === scope && c.category === category && c.name === name);

export const getComponentByPackage = (packageName: string): CatalogComponent | undefined =>
  catalog.components.find((c) => c.packageName === packageName);

/** Components grouped by category, in the catalog's category order. */
export function groupByCategory(components: CatalogComponent[]): { key: string; label: string; components: CatalogComponent[] }[] {
  return catalog.categories
    .map((category) => ({
      key: category.key,
      label: category.label,
      components: components.filter((c) => c.category === category.key),
    }))
    .filter((group) => group.components.length > 0);
}

/** Case-insensitive match on name, title, package name and summary. */
export function searchComponents(components: CatalogComponent[], query: string): CatalogComponent[] {
  const q = query.trim().toLowerCase();
  if (!q) return components;
  return components.filter((c) =>
    [c.name, c.title, c.packageName, c.summary, c.category].some((field) => field.toLowerCase().includes(q)),
  );
}

/** The most recent releases across the registry, for the home page. Newest versions first per component, then interleaved by file order. */
export function latestReleases(limit = 8): { component: CatalogComponent; version: string; notes: string }[] {
  return catalog.components
    .flatMap((component) => component.releases.slice(0, 1).map((release) => ({ component, ...release })))
    .sort((a, b) => compareVersions(b.version, a.version) || a.component.packageName.localeCompare(b.component.packageName))
    .slice(0, limit);
}

/** Semver-ish comparison good enough for ordering releases. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
