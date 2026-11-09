import type { Metadata, Viewport } from "next";
import { catalog } from "@/lib/catalog";
import { fontClassName } from "@/generated/fonts";
import "@/app/globals.scss";
// The theme: every MD3 colour role for both schemes, generated from
// registry.config.json#site.theme after the token sheet globals.scss imports,
// so cascade order alone re-themes the chrome and every component.
import "@/generated/theme.css";
// The site's chrome is the @behivetech components; each package ships its own stylesheet.
import "@behivetech/atoms.badge/styles.css";
import "@behivetech/atoms.button/styles.css";
import "@behivetech/atoms.card/styles.css";
import "@behivetech/atoms.table/styles.css";
import "@behivetech/atoms.text-field/styles.css";
import "@behivetech/molecules.empty-state/styles.css";
import "@behivetech/organisms.hero-banner/styles.css";

const { site } = catalog;

/**
 * Icons come from registry.config.json#site (files under branding/); with
 * none configured the app's own /favicon.ico stands. They are declared here
 * rather than as file conventions in src/app so the owner's files win without
 * editing template-owned paths.
 */
const icons: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: site.favicon ?? "/favicon.ico" },
    ...(site.icons.png192 ? [{ url: site.icons.png192, sizes: "192x192", type: "image/png" }] : []),
    ...(site.icons.png512 ? [{ url: site.icons.png512, sizes: "512x512", type: "image/png" }] : []),
  ],
  ...(site.icons.apple ? { apple: [{ url: site.icons.apple, sizes: "180x180" }] } : {}),
};

export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.title}` },
  description: site.description ?? undefined,
  icons,
};

export const viewport: Viewport = site.themeColor
  ? { themeColor: site.themeColor }
  : {};

/**
 * Root layout for the whole docs site. Everything it needs — title, icons,
 * fonts, theme — is in the build-time catalog and the generated modules next
 * to it (all copied from registry.config.json), so there is no provider, no
 * session and nothing to stream: the page is complete HTML in the static
 * export. `fontClassName` exposes the configured font variables on <html>.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontClassName}>
      <body>{children}</body>
    </html>
  );
}
