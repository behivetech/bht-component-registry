import { resolveSnapshot, versionParams, type VersionParams } from "@/lib/history";
import { getClassName } from "@bht-component-registry/class-names";
import { Markdown } from "@/components/docs/markdown";
import { TabPage } from "@/components/docs/tab-page";
import { VersionBanner } from "@/components/docs/version-banner";
import styles from "../../page.module.scss";

const [rootClass, getChildClass] = getClassName({
  rootClass: "ChangelogPage",
  styles,
});

interface Props {
  params: Promise<VersionParams>;
}

export const dynamicParams = false;
export const generateStaticParams = versionParams;

/** The changelog as it stood at this version: that release and everything before it. */
export default async function VersionChangelogPage({ params }: Props) {
  const { component, snapshot, base } = resolveSnapshot(await params);
  return (
    <TabPage>
      <VersionBanner
        base={base}
        title={component.title}
        version={snapshot.version}
        current={component.version}
        date={snapshot.date}
      />
      <section>
        <h2>Changelog up to v{snapshot.version}</h2>
        {snapshot.releases.length === 0 ? (
          <TabPage.Note>
            No release notes up to v{snapshot.version}: the package had not
            been through <code>pnpm changeset</code> yet.
          </TabPage.Note>
        ) : (
          <div className={rootClass}>
            {snapshot.releases.map((release) => (
              <article key={release.version} className={getChildClass("release")}>
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
