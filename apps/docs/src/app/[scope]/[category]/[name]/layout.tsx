import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  catalog,
  CATEGORY_LABELS,
  getComponent,
  getScope,
} from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@behivetech/atoms.badge";
import { ComponentTabs } from "@/components/docs/component-tabs";
import { StatusBadge } from "@/components/docs/status-badge";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./layout.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
  children: React.ReactNode;
}

/** Static export: every component in the catalog is prerendered; anything else is the host's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.components.map((c) => ({
    scope: c.scope,
    category: c.category,
    name: c.name,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  return component
    ? {
        title: `${component.title} · @${scope}`,
        description: component.summary,
      }
    : {};
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

  const [rootClass, getChildClass] = getClassName({
    rootClass: "ComponentLayout",
    styles,
  });
  return (
    <>
      <SiteHeader />
      <main className={rootClass}>
        <nav className={getChildClass("breadcrumbs")} aria-label="Breadcrumb">
          <Link href={`/${slug}`}>{scope.name}</Link>
          <span aria-hidden>/</span>
          <span>{CATEGORY_LABELS[category] ?? category}</span>
        </nav>

        <header className={getChildClass("header")}>
          <div className={getChildClass("headline")}>
            <h1 className={getChildClass("title")}>{component.title}</h1>
            <span className={getChildClass("version")}>
              v{component.version}
            </span>
            <StatusBadge status={component.status} />
            {component.visibility === "private" && (
              <Badge
                variant="default"
                title={`Publishes to ${component.publishRegistry}; installing needs a token`}
              >
                Private
              </Badge>
            )}
          </div>
          <p className={getChildClass("summary")}>{component.summary}</p>
          <div className={getChildClass("meta-row")}>
            <code className={getChildClass("install")}>
              pnpm add {component.packageName}
            </code>
            {component.tags.length > 0 && (
              <ul className={getChildClass("tags")} aria-label="Tags">
                {component.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <ComponentTabs
          base={`/${slug}/${category}/${name}`}
          design={component.design.length > 0}
        />
        <div className={getChildClass("content")}>{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
