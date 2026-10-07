import Link from "next/link";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { HeroBanner } from "@/ui/hero-banner";
import { catalog, getScopes, latestReleases } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CodeBlock } from "@/components/docs/code-block";
import styles from "./page.module.scss";

const PILLARS = [
  {
    title: "The folder tree is the registry",
    body: "registry/<scope>/<category>/<name> becomes @<scope>/<category>.<name>. Ownership, docs, props and versions all derive from files in the repo — nothing to keep in sync.",
  },
  {
    title: "Scopes keep teams apart",
    body: "Each folder under registry/ is an npm scope: every package inside it is @<scope>/<category>.<name>. A scope.json names the team and its tagline; who may change it is a matter for git, not for the site.",
  },
  {
    title: "Docs generated, not written twice",
    body: "react-docgen reads each component's TypeScript for the props table; compositions become live, editable examples; the README is rendered with its snippets running.",
  },
  {
    title: "Versioned and published",
    body: "Changesets bump semver and write the changelog; pnpm release publishes to npmjs by default, or to any registry your .npmrc points at. The site shows what each scope shipped, and when.",
  },
];

/**
 * The registry home. Everything on it is build-time data from the catalog:
 * the site's name and description, the public scopes, and the newest release
 * of each component. There is nothing to fetch at request time, so the page
 * is complete HTML in the static export.
 */
export default function RegistryHomePage() {
  const { site, primaryScope } = catalog;
  const scopes = getScopes();
  const releases = latestReleases(6);

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <HeroBanner
          headline={site.title}
          subtext={site.description ?? "A component registry that stays in git."}
          ctaButtons={[
            { label: `Browse @${primaryScope}`, href: `/${primaryScope}`, variant: "primary" },
            {
              label: "How to add a component",
              href: "https://github.com/behivetech/bht-component-registry/blob/main/docs/components.md",
              variant: "secondary",
            },
          ]}
        />

        <section className={styles.section} id="scopes">
          <h2>Scopes</h2>
          <div className={styles.grid}>
            {scopes.map((scope) => (
              <Card key={scope.slug} title={scope.name} headingLevel={3} padding="md" action={<code>@{scope.slug}</code>}>
                <p>{scope.tagline ?? "No description yet."}</p>
                <p className={styles.count}>
                  {scope.componentCount} component{scope.componentCount === 1 ? "" : "s"}
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/${scope.slug}`}>Browse {scope.name}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Latest releases</h2>
          <ul className={styles.releases}>
            {releases.map(({ component, version, notes }) => (
              <li key={component.packageName}>
                <Link href={`/${component.scope}/${component.category}/${component.name}/changelog`}>
                  <code>{component.packageName}</code>
                </Link>{" "}
                <strong>v{version}</strong>
                <p>{notes.split("\n").find((line) => line.startsWith("- "))?.slice(2) ?? "Release notes in the changelog."}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How it works</h2>
          <div className={styles.grid}>
            {PILLARS.map((pillar) => (
              <Card key={pillar.title} title={pillar.title} headingLevel={3} padding="md">
                <p>{pillar.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Add a component to your scope</h2>
          <p>Three commands from an empty folder to a documented, versioned package:</p>
          <CodeBlock
            language="bash"
            code={`pnpm gen                     # scope → category → name; scaffolds registry/<scope>/…\npnpm changeset               # describe the change; Changesets bumps the version\npnpm release                 # build + publish to your npm registry (npmjs by default)`}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
