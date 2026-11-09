import Link from "next/link";
import { Button } from "@behivetech/atoms.button";
import { Card } from "@behivetech/atoms.card";
import { HeroBanner } from "@behivetech/organisms.hero-banner";
import { catalog, getScopes, latestReleases } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./page.module.scss";

/**
 * The registry home, for the people who use the components. Everything on it
 * is build-time data from the catalog: the hero (title, description and
 * actions from registry.config.json#site.hero, with defaults), the public
 * scopes, and the newest release of each component. How to contribute lives
 * in the Docs section, not here. There is nothing to fetch at request time,
 * so the page is complete HTML in the static export.
 */
export default function RegistryHomePage() {
  const { site } = catalog;
  const scopes = getScopes();
  const releases = latestReleases(6);
  const [rootClass, getChildClass] = getClassName({
    rootClass: "HomePage",
    styles,
  });

  return (
    <>
      <SiteHeader />
      <main className={rootClass}>
        <HeroBanner
          headline={site.hero.headline}
          subtext={site.hero.subtext}
          ctaButtons={site.hero.actions}
        />

        <section className={getChildClass("section")} id="scopes">
          <h2>Scopes</h2>
          <div className={getChildClass("grid")}>
            {scopes.map((scope) => (
              <Card
                key={scope.slug}
                title={scope.name}
                headingLevel={3}
                padding="md"
                action={<code>@{scope.slug}</code>}
              >
                <p>{scope.tagline ?? "No description yet."}</p>
                <p className={getChildClass("count")}>
                  {scope.componentCount} component
                  {scope.componentCount === 1 ? "" : "s"}
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/${scope.slug}`}>Browse {scope.name}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className={getChildClass("section")}>
          <h2>Latest releases</h2>
          <ul className={getChildClass("releases")}>
            {releases.map(({ component, version, notes }) => (
              <li key={component.packageName}>
                <Link
                  href={`/${component.scope}/${component.category}/${component.name}/changelog`}
                >
                  <code>{component.packageName}</code>
                </Link>{" "}
                <strong>v{version}</strong>
                <p>
                  {notes
                    .split("\n")
                    .find((line) => line.startsWith("- "))
                    ?.slice(2) ?? "Release notes in the changelog."}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
