import Link from "next/link";
import { getClassName } from "@bht-component-registry/class-names";
import { catalog } from "@/lib/catalog";
import { getDocPage } from "@/lib/docs";
import styles from "./site-footer.module.scss";

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * A small footer on every page: the configured site links again (the header
 * scrolls away on long catalog pages), a credit line pointing at the
 * open-source template, and the Terms page while the owner keeps it.
 */
export function SiteFooter() {
  const { site } = catalog;
  const terms = getDocPage("guide/terms");
  const [rootClass, getChildClass] = getClassName({
    rootClass: "SiteFooter",
    styles,
  });
  return (
    <footer className={rootClass}>
      {site.links.length > 0 && (
        <nav className={getChildClass("links")} aria-label="Site links">
          {site.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              rel={isExternal(link.href) ? "noreferrer" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
      <p className={getChildClass("credit")}>
        Built with{" "}
        <a href="https://github.com/behivetech/bht-component-registry">
          bht-component-registry
        </a>
        {terms && (
          <>
            {" · "}
            <Link href={`/docs/${terms.slug}`}>{terms.title}</Link>
          </>
        )}
      </p>
    </footer>
  );
}
