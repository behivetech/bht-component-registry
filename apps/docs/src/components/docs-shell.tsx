import Link from "next/link";
import { getClassName } from "@bht-component-registry/class-names";
import { getDocSections } from "@/lib/docs";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import styles from "./docs-shell.module.scss";

/**
 * The Docs section's frame: the site chrome, a sidebar listing every page by
 * section, and the page itself. All build-time data, so it is static markup;
 * the current page is marked with `aria-current` for styling and readers.
 */
export function DocsShell({
  current,
  children,
}: {
  current?: string;
  children: React.ReactNode;
}) {
  const sections = getDocSections();
  const [rootClass, getChildClass] = getClassName({
    rootClass: "DocsShell",
    styles,
  });
  return (
    <>
      <SiteHeader />
      <div className={rootClass}>
        <nav className={getChildClass("nav")} aria-label="Docs">
          {sections.map((section) => (
            <div key={section.key} className={getChildClass("section")}>
              <p className={getChildClass("section-label")}>{section.label}</p>
              <ul className={getChildClass("list")}>
                {section.pages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/docs/${page.slug}`}
                      className={getChildClass("link")}
                      aria-current={page.slug === current ? "page" : undefined}
                      title={page.description ?? undefined}
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main className={getChildClass("main")}>{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
