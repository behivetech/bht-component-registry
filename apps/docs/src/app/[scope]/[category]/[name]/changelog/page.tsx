import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { loadPublishedVersions, publishedRegistryHost } from "@/lib/published";
import { Markdown } from "@/components/docs/markdown";
import styles from "../page.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/**
 * Versions: the CHANGELOG Changesets writes on every release, and what the
 * npm registry says has actually been published. Both are resolved at build
 * time — the registry is asked once per package while the export is
 * generated, never from a visitor's browser.
 */
export default async function ChangelogPage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  return (
    <div className={styles.stack}>
      <section>
        <h2>Published to {publishedRegistryHost()}</h2>
        <Suspense fallback={<p className={styles.muted}>Checking the registry…</p>}>
          <PublishedVersions packageName={component.packageName} current={component.version} />
        </Suspense>
      </section>

      <section>
        <h2>Changelog</h2>
        {component.releases.length === 0 ? (
          <p className={styles.muted}>
            No releases yet — <code>{component.packageName}</code> is at {component.version} in the repo and has not been through <code>pnpm changeset</code>.
          </p>
        ) : (
          <div className={styles.releases}>
            {component.releases.map((release) => (
              <article key={release.version} className={styles.release}>
                <h3>v{release.version}</h3>
                <Markdown>{release.notes}</Markdown>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function PublishedVersions({ packageName, current }: { packageName: string; current: string }) {
  const versions = await loadPublishedVersions(packageName);
  if (versions === null) {
    return (
      <p className={styles.muted}>
        Set <code>REGISTRY_READ_TOKEN</code> at build time to list published versions from a private registry. The repo is at{" "}
        <strong>v{current}</strong>.
      </p>
    );
  }
  if (versions.length === 0) {
    return (
      <p className={styles.muted}>
        Not published yet. The repo is at <strong>v{current}</strong>.
      </p>
    );
  }
  return (
    <ul className={styles.published}>
      {versions.map((v) => (
        <li key={v.version} title={v.publishedAt ?? undefined}>
          v{v.version}
          {v.version === current ? " · current" : ""}
        </li>
      ))}
    </ul>
  );
}
