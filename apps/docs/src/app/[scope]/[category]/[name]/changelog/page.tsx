import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { loadPublishedVersions, publishedRegistryHost } from "@/lib/published";
import { getClassName } from "@bht-component-registry/class-names";
import { Markdown } from "@/components/docs/markdown";
import { TabPage } from "@/components/docs/tab-page";
import styles from "./page.module.scss";

const [rootClass, getChildClass] = getClassName({
  rootClass: "ChangelogPage",
  styles,
});

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
    <TabPage>
      <section>
        <h2>Published to {publishedRegistryHost(component.publishRegistry)}</h2>
        <Suspense
          fallback={<TabPage.Note>Checking the registry…</TabPage.Note>}
        >
          <PublishedVersions
            packageName={component.packageName}
            registry={component.publishRegistry}
            current={component.version}
          />
        </Suspense>
      </section>

      <section>
        <h2>Changelog</h2>
        {component.releases.length === 0 ? (
          <TabPage.Note>
            No releases yet — <code>{component.packageName}</code> is at{" "}
            {component.version} in the repo and has not been through{" "}
            <code>pnpm changeset</code>.
          </TabPage.Note>
        ) : (
          <div className={rootClass}>
            {component.releases.map((release) => (
              <article
                key={release.version}
                className={getChildClass("release")}
              >
                <h3>v{release.version}</h3>
                <Markdown>{release.notes}</Markdown>
              </article>
            ))}
          </div>
        )}
      </section>
    </TabPage>
  );
}

async function PublishedVersions({
  packageName,
  registry,
  current,
}: {
  packageName: string;
  registry: string;
  current: string;
}) {
  const versions = await loadPublishedVersions(packageName, registry);
  if (versions === null) {
    return (
      <TabPage.Note>
        Set <code>REGISTRY_READ_TOKEN</code> at build time to list published
        versions from a private registry. The repo is at{" "}
        <strong>v{current}</strong>.
      </TabPage.Note>
    );
  }
  if (versions.length === 0) {
    return (
      <TabPage.Note>
        Not published yet. The repo is at <strong>v{current}</strong>.
      </TabPage.Note>
    );
  }
  return (
    <ul className={getChildClass("published")}>
      {versions.map((v) => (
        <li key={v.version} title={v.publishedAt ?? undefined}>
          v{v.version}
          {v.version === current ? " · current" : ""}
        </li>
      ))}
    </ul>
  );
}
