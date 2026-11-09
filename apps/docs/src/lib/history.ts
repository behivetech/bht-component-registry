import { notFound } from "next/navigation";
import historyJson from "@/generated/history.json";
import { getComponent } from "./catalog";
import { versionFromSlug, versionSlug } from "./catalog/history";
import type { CatalogComponent, HistoryEntry, HistoryIndex } from "./catalog/types";

/**
 * Read access to the per-version docs, built at the same time as the catalog
 * from docs-history/<scope>/<category>/<name>/<version>/. Kept out of
 * catalog.json because only the version pages and the switcher need it.
 *
 * URL shape: the version is the LAST segment and dotless — `/<base>/v/1_2_0`
 * for the overview, `/<base>/code/v/1_2_0` for a tab (see versionSlug) — so
 * every version page is a plain `1_2_0.html` on any static host.
 */
export const history = historyJson as HistoryIndex;

export const getHistory = (packageName: string): HistoryEntry[] =>
  history[packageName] ?? [];

export const getSnapshot = (
  packageName: string,
  version: string,
): HistoryEntry | undefined =>
  getHistory(packageName).find((entry) => entry.version === version);

export interface VersionParams {
  scope: string;
  category: string;
  name: string;
  /** The URL token (`1_2_0`), not the version itself. */
  version: string;
}

/**
 * `generateStaticParams` for every `v/[version]` segment: Next calls it once
 * per component the parent layout lists; the snapshot versions of that
 * component become its pages. Static export: anything else is a 404.
 */
export function versionParams({
  params,
}: {
  params: { scope: string; category: string; name: string };
}): { version: string }[] {
  const component = getComponent(params.scope, params.category, params.name);
  if (!component) return [];
  return getHistory(component.packageName).map((entry) => ({ version: versionSlug(entry.version) }));
}

/** The component and its snapshot for a version page, or the 404 page. */
export function resolveSnapshot(params: VersionParams): {
  component: CatalogComponent;
  snapshot: HistoryEntry;
  base: string;
} {
  const component = getComponent(params.scope, params.category, params.name);
  const version =
    component && versionFromSlug(params.version, component.versions);
  const snapshot = component && version ? getSnapshot(component.packageName, version) : undefined;
  if (!component || !snapshot) notFound();
  return {
    component,
    snapshot,
    base: `/${params.scope}/${params.category}/${params.name}`,
  };
}
