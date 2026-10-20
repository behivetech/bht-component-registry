import type { Metadata } from "next";
import { catalog } from "@/lib/catalog";
import { inter } from "@/app/fonts";
import "@/app/globals.scss";
// The site's chrome is the @behivetech components; each package ships its own stylesheet.
import "@behivetech/atoms.badge/styles.css";
import "@behivetech/atoms.button/styles.css";
import "@behivetech/atoms.card/styles.css";
import "@behivetech/atoms.table/styles.css";
import "@behivetech/atoms.text-field/styles.css";
import "@behivetech/molecules.empty-state/styles.css";
import "@behivetech/organisms.hero-banner/styles.css";

const { site } = catalog;

export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.title}` },
  description: site.description ?? undefined,
};

/**
 * Root layout for the whole docs site. Everything it needs — title, brand
 * color — is in the build-time catalog (copied there from
 * registry.config.json), so there is no provider, no session and nothing to
 * stream: the page is complete HTML in the static export.
 *
 * `--site-primary` is set inline so globals.scss can re-derive the MD3
 * primary roles from it; when no primaryColor is configured the variable is
 * absent and the token sheet's default stands.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      style={
        site.primaryColor
          ? ({
              ["--site-primary" as string]: site.primaryColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      <body>{children}</body>
    </html>
  );
}
