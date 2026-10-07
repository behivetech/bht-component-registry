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
  /** Live-example source for the tile, or null when the component can't be shown in a tile. */
  thumbnailCode: string | null;
}

/**
 * Components that render through a portal — a modal, a drawer, a toast — put
 * their UI over the whole page, not inside a tile. Thumbnailing one of those
 * would open it on top of the catalog (and, with `aria-modal`, hide the rest
 * of the page from assistive tech). They get a placeholder tile instead and
 * are shown on their own pages, where an open overlay is the point.
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

export const isOverlayComponent = (component: Pick<CatalogComponent, "exportNames">) =>
  component.exportNames.some((name) => OVERLAY_EXPORTS.has(name));

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
    thumbnailCode: isOverlayComponent(component) ? null : (component.examples[0]?.code ?? null),
  };
}
