import { notFound } from "next/navigation";
import { catalog } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeBuilder } from "@/components/docs/theme-builder/theme-builder";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./page.module.scss";

export const metadata = {
  title: "Theme builder",
  description:
    "Pick seed colours, watch every Material Design 3 role update, edit roles, and download the CSS.",
};

/**
 * The theme builder: the same Material Design 3 generator the build uses for
 * this site's own theme (registry.config.json#site.theme), run in the
 * browser. The page is static; the builder is a client island that keeps its
 * state in the URL fragment so a theme is a shareable link. Off when
 * registry.config.json#docs.themeBuilder is false — the route then renders
 * the 404 page and the header hides its link.
 */
export default function ThemePage() {
  if (!catalog.docs.themeBuilder) notFound();
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ThemePage",
    styles,
  });
  return (
    <>
      <SiteHeader />
      <main className={rootClass}>
        <h1>Theme builder</h1>
        <p className={getChildClass("lead")}>
          Every component here reads Material Design 3 colour roles
          (<code>--md-sys-color-*</code>). Pick your brand colours and the
          whole palette is generated for the light and the dark scheme with
          Google&apos;s algorithm, the one behind the Material Theme Builder.
          Adjust any role by hand, then download the CSS or copy the config
          for this registry.
        </p>
        <ThemeBuilder
          initial={catalog.site.theme}
          tokensPackage={catalog.tokens ? catalog.tokens.packageName : null}
        />
      </main>
      <SiteFooter />
    </>
  );
}
