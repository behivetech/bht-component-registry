import Link from "next/link";
import { getClassName } from "@bht-component-registry/class-names";
import { catalog } from "@/lib/catalog";
import { getDocPages } from "@/lib/docs";
import styles from "./site-header.module.scss";

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * The site's top bar: brand, the registry nav, and whatever links
 * registry.config.json lists (GitHub, a company site…). Everything here is
 * build-time data, so the header is plain static markup — no session, no
 * Suspense.
 *
 * Branding: `site.logo` (a file under branding/) replaces the title text;
 * `site.logoDark` is shown instead on the dark scheme; `site.headerTheme:
 * "dark"` keeps the bar on the dark scheme's surface in both schemes, for a
 * light wordmark.
 */
export function SiteHeader() {
  const { site, tokens, docs } = catalog;
  const dark = site.headerTheme === "dark";
  const paired = !dark && Boolean(site.logo && site.logoDark);
  const [rootClass, getChildClass] = getClassName({
    rootClass: "SiteHeader",
    styles,
    modifiers: { dark, paired },
  });
  return (
    <header className={rootClass}>
      <div className={getChildClass("inner")}>
        <div className={getChildClass("left")}>
          <Link href="/" className={getChildClass("brand")}>
            {site.logo ? (
              // Plain <img>s: the static export has no image optimizer, and the
              // logo may be an external URL. When both logos are configured
              // exactly one is displayed at a time (the stylesheet hides the
              // other), so both carry the name the link needs.
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer */}
                <img
                  src={dark ? (site.logoDark ?? site.logo) : site.logo}
                  alt={site.title}
                  height={28}
                  className={getChildClass("logo")}
                />
                {paired && (
                  // eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer
                  <img
                    src={site.logoDark!}
                    alt={site.title}
                    height={28}
                    className={getChildClass("logo-dark")}
                  />
                )}
              </>
            ) : (
              site.title
            )}
          </Link>
          <nav className={getChildClass("links")} aria-label="Registry">
            <Link href="/#scopes">Scopes</Link>
            {/* The tokens page exists only when a scope declares a tokens.scss. */}
            {tokens && <Link href="/tokens">Design tokens</Link>}
            {/* The theme builder is on unless registry.config.json#docs.themeBuilder turns it off. */}
            {docs.themeBuilder && <Link href="/theme">Theme</Link>}
            {/* The Docs section exists when any page does — the template's defaults or the owner's docs/. */}
            {getDocPages().length > 0 && <Link href="/docs">Docs</Link>}
          </nav>
        </div>
        {site.links.length > 0 && (
          <nav className={getChildClass("nav")} aria-label="Site links">
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
      </div>
    </header>
  );
}
