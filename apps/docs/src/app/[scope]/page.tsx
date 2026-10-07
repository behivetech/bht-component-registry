import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EmptyState } from "@/ui/empty-state";
import { getComponents, getScope, getScopes, groupByCategory } from "@/lib/catalog";
import { toCardModel } from "@/lib/catalog/card-model";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScopeCatalog } from "@/components/docs/scope-catalog";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ scope: string }>;
}

/**
 * Static export: every scope in the catalog is prerendered here, private ones
 * included (they are reachable by URL, just not listed on the home page).
 * There is no server to render anything else, so an unknown slug is not a
 * route at all — the host serves the exported 404 page for it.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getScopes(true).map((scope) => ({ scope: scope.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scope: slug } = await params;
  const scope = getScope(slug);
  if (!scope) return {};
  return { title: `@${slug}`, description: scope.tagline ?? undefined };
}

/**
 * A scope's catalog — every component it owns, grouped by category, with a
 * live thumbnail each. Name and tagline come from the scope's scope.json;
 * status and tags from each package.json. All of it is in the catalog.
 */
export default async function ScopePage({ params }: Props) {
  const { scope: slug } = await params;
  const scope = getScope(slug);
  if (!scope) notFound();

  const groups = groupByCategory(getComponents(slug)).map((group) => ({
    ...group,
    components: group.components.map((component) => toCardModel(component)),
  }));

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Scope</p>
          <h1>{scope.name}</h1>
          {scope.tagline && <p className={styles.tagline}>{scope.tagline}</p>}
          <p className={styles.install}>
            <code>{`@${slug}/*`}</code> · {scope.componentCount} component{scope.componentCount === 1 ? "" : "s"}
          </p>
        </header>
        {groups.length > 0 ? (
          <ScopeCatalog groups={groups} />
        ) : (
          <EmptyState description={`No packages yet under registry/${slug}/. Scaffold the first one with: pnpm gen`} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
