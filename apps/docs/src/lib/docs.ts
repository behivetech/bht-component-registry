import docsJson from "@/generated/docs.json";
import type { DocPage, DocsIndex } from "./catalog/types";

/**
 * Read access to the Docs section, built at the same time as the catalog from
 * apps/docs/default-docs/**\/*.md (the template's) and docs/**\/*.md (the
 * owner's, replacing a default at the same path). Pages arrive already
 * sorted: top-level pages ("General") first, then each folder as a section,
 * ordered by frontmatter.
 */
export const docs = docsJson as DocsIndex;

export const getDocPages = (): DocPage[] => docs.pages;

export const getDocPage = (slug: string): DocPage | undefined =>
  docs.pages.find((page) => page.slug === slug);

export interface DocSection {
  key: string;
  label: string;
  pages: DocPage[];
}

/** Pages grouped by section, in page order. */
export function getDocSections(): DocSection[] {
  const sections: DocSection[] = [];
  for (const page of docs.pages) {
    const section = sections.find((s) => s.key === page.section);
    if (section) section.pages.push(page);
    else
      sections.push({
        key: page.section,
        label: page.sectionLabel,
        pages: [page],
      });
  }
  return sections;
}

export { resolveDocLink } from "./doc-links";
