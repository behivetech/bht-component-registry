import { catalog } from "@/lib/catalog";
import styles from "./site-footer.module.scss";

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * A small footer on every page: the configured site links again (the header
 * scrolls away on long catalog pages) and a fixed credit line pointing at the
 * open-source repo and its hosted, expanded counterpart.
 */
export function SiteFooter() {
  const { site } = catalog;
  return (
    <footer className={styles.footer}>
      {site.links.length > 0 && (
        <nav className={styles.links} aria-label="Site links">
          {site.links.map((link) => (
            <a key={link.href} href={link.href} rel={isExternal(link.href) ? "noreferrer" : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
      <p className={styles.credit}>
        Built with <a href="https://github.com/behivetech/bht-component-registry">bht-component-registry</a> ·{" "}
        <a href="https://platform.behivetech.com/expanded">Hosted &amp; expanded version</a>
      </p>
    </footer>
  );
}
