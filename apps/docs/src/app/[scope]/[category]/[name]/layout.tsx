import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { catalog, CATEGORY_LABELS, getComponent, getScope } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ComponentTabs } from "@/components/docs/component-tabs";
import { StatusBadge } from "@/components/docs/status-badge";
import styles from "./layout.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
  children: React.ReactNode;
}

/** Static export: every component in the catalog is prerendered; anything else is the host's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.components.map((c) => ({ scope: c.scope, category: c.category, name: c.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  return component ? { title: `${component.title} · @${scope}`, description: component.summary } : {};
}

/**
 * The frame around every tab of a component page: the component header
 * (name, package, version, status, tags, install snippet) and the
 * tab bar. Status and tags come from the component's package.json
 * (`registry.status`, `registry.tags`) by way of the catalog.
 */
export default async function ComponentLayout({ params, children }: Props) {
  const { scope: slug, category, name } = await params;
  const component = getComponent(slug, category, name);
  const scope = getScope(slug);
  if (!component || !scope) notFound();

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href={`/${slug}`}>{scope.name}</Link>
          <span aria-hidden>/</span>
          <span>{CATEGORY_LABELS[category] ?? category}</span>
        </nav>

        <header className={styles.header}>
          <div className={styles.headline}>
            <h1 className={styles.title}>{component.title}</h1>
            <span className={styles.version}>v{component.version}</span>
            <StatusBadge status={component.status} />
          </div>
          <p className={styles.summary}>{component.summary}</p>
          <div className={styles.metaRow}>
            <code className={styles.install}>pnpm add {component.packageName}</code>
            {component.tags.length > 0 && (
              <ul className={styles.tags} aria-label="Tags">
                {component.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <ComponentTabs base={`/${slug}/${category}/${name}`} />
        <div className={styles.content}>{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
