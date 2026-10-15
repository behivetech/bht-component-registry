import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDocPage, getDocPages, resolveDocLink } from "@/lib/docs";
import { DocsShell } from "@/components/docs-shell";
import { Markdown } from "@/components/docs/markdown";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ slug: string[] }>;
}

/**
 * Static export: every page under docs/ is prerendered here. There is no
 * server to render anything else, so an unknown slug is not a route — the
 * host serves the exported 404 for it.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getDocPages().map((page) => ({ slug: page.slug.split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocPage(slug.join("/"));
  if (!page) return {};
  return { title: page.title, description: page.description ?? undefined };
}

/**
 * One docs page. The body is the Markdown file with its H1 removed (the
 * title is rendered from frontmatter, so it reads the same with or without
 * one). Relative `.md` links resolve to sibling pages; ```jsx live fences
 * run as examples with the whole registry in scope.
 */
export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const page = getDocPage(slug.join("/"));
  if (!page) notFound();

  const [rootClass, getChildClass] = getClassName({
    rootClass: "DocPage",
    styles,
  });
  return (
    <DocsShell current={page.slug}>
      <article className={rootClass}>
        <p className={getChildClass("eyebrow")}>{page.sectionLabel}</p>
        <h1>{page.title}</h1>
        {page.description && (
          <p className={getChildClass("description")}>{page.description}</p>
        )}
        <Markdown
          liveFences="opt-in"
          resolveLink={(href) => resolveDocLink(page.slug, href)}
        >
          {page.body}
        </Markdown>
      </article>
    </DocsShell>
  );
}
