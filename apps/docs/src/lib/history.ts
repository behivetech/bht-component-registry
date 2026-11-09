import { notFound } from "next/navigation";
import historyJson from "@/generated/history.json";
import { getComponent } from "./catalog";
import { SNAPSHOT_TABS, versionFromSlug, versionSlug } from "./catalog/history";
import type { CatalogComponent, HistoryEntry, HistoryIndex } from "./catalog/types";

/**
 * Read access to the per-version docs, built at the same time as the catalog
 * from docs-history/<scope>/<category>/<name>/<version>/. Kept out of
 * catalog.json because only the version pages and the switcher need it.
 *
 * URL shape: one optional catch-all under the component, `/<base>/v` (the
 * versions index), `/<base>/v/1_2_0` (an overview) and `/<base>/v/1_2_0/code`
 * (a tab), with the version as a dotless token (see versionSlug) so no static
 * host reads it as a file extension.
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
  /** The optional catch-all: absent for `/v`, `[token]` for an overview, `[token, tab]` for a tab. */
  version?: string[];
}

/**
 * `generateStaticParams` for the `v/[[...version]]` segment: Next calls it
 * once per component the parent layout lists. The versions index (`/v`, no
 * segments) is always among the results — a static export refuses a route
 * that generates nothing, and a component without snapshots still has an
 * index page that says so — then an overview and the tabs per snapshot.
 */
export function versionParams({
  params,
}: {
  params: { scope: string; category: string; name: string };
}): { version: string[] }[] {
  const component = getComponent(params.scope, params.category, params.name);
  if (!component) return [{ version: [] }];
  return [
    { version: [] },
    ...getHistory(component.packageName).flatMap((entry) => {
      const slug = versionSlug(entry.version);
      return SNAPSHOT_TABS.map((tab) => ({ version: tab ? [slug, tab.slice(1)] : [slug] }));
    }),
  ];
}

/** The component and its snapshot for a version page, or the 404 page. */
export function resolveSnapshot(
  params: Pick<VersionParams, "scope" | "category" | "name">,
  slug: string,
): {
  component: CatalogComponent;
  snapshot: HistoryEntry;
  base: string;
} {
  const component = getComponent(params.scope, params.category, params.name);
  const version = component && versionFromSlug(slug, component.versions);
  const snapshot = component && version ? getSnapshot(component.packageName, version) : undefined;
  if (!component || !snapshot) notFound();
  return {
    component,
    snapshot,
    base: `/${params.scope}/${params.category}/${params.name}`,
  };
}
