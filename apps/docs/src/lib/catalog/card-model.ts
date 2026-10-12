import type { CatalogComponent, CatalogStatus } from "./types";

/** Just what a catalog card needs; serializable, so a client component can hold a list of them. */
export interface ComponentCardModel {
  scope: string;
  category: string;
  name: string;
  packageName: string;
  version: string;
  title: string;
  summary: string;
  tags: string[];
  status: CatalogStatus;
  visibility: CatalogComponent["visibility"];
  /** Live-example source for the tile, or null when the component can't be shown in a tile. */
  thumbnailCode: string | null;
}

/**
 * Components that render through a portal — a modal, a drawer, a toast — put
 * their UI over the whole page, not inside a tile. Thumbnailing one of those
 * would open it on top of the catalog (and, with `aria-modal`, hide the rest
 * of the page from assistive tech). They get a placeholder tile instead and
 * are shown on their own pages, where an open overlay is the point — inside
 * its own preview frame, so it covers the example and nothing else.
 *
 * A package says so itself with `registry.preview.thumbnail: false`; this
 * list is the fallback for packages that haven't, keyed on the export names
 * such components conventionally use.
 */
export const OVERLAY_EXPORTS = new Set([
  "Modal",
  "Drawer",
  "Dialog",
  "ConfirmDialog",
  "Toast",
  "Tooltip",
  "DropdownMenu",
  "Popover",
]);

export const isOverlayComponent = (component: Pick<CatalogComponent, "exportNames" | "thumbnail">) =>
  !component.thumbnail || component.exportNames.some((name) => OVERLAY_EXPORTS.has(name));

/** The slice of a catalog entry a card needs — the full entry carries every source file. */
export function toCardModel(component: CatalogComponent): ComponentCardModel {
  return {
    scope: component.scope,
    category: component.category,
    name: component.name,
    packageName: component.packageName,
    version: component.version,
    title: component.title,
    summary: component.summary,
    tags: component.tags,
    status: component.status,
    visibility: component.visibility,
    thumbnailCode: isOverlayComponent(component) ? null : (component.examples[0]?.code ?? null),
  };
}
