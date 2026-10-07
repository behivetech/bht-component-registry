import Link from "next/link";
import { catalog } from "@/lib/catalog";
import styles from "./site-header.module.scss";

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * The site's top bar: brand, the registry nav, and whatever links
 * registry.config.json lists (GitHub, a company site…). Everything here is
 * build-time data, so the header is plain static markup — no session, no
 * Suspense.
 */
export function SiteHeader() {
  const { site, tokens } = catalog;
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/" className={styles.brand}>
          {site.logo ? (
            // A plain <img>: the static export has no image optimizer, and the
            // logo may be an external URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logo} alt={site.title} height={28} className={styles.logo} />
          ) : (
            site.title
          )}
        </Link>
        <nav className={styles.links} aria-label="Registry">
          <Link href="/#scopes">Scopes</Link>
          {/* The tokens page exists only when a scope declares a tokens.scss. */}
          {tokens && <Link href="/tokens">Design tokens</Link>}
        </nav>
      </div>
      {site.links.length > 0 && (
        <nav className={styles.nav} aria-label="Site links">
          {site.links.map((link) => (
            <a key={link.href} href={link.href} rel={isExternal(link.href) ? "noreferrer" : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
