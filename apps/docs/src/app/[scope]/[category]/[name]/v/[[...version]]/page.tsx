import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getComponent } from "@/lib/catalog";
import { getHistory, resolveSnapshot, versionParams, type VersionParams } from "@/lib/history";
import { parseVersionSegments, versionedPath } from "@/lib/catalog/history";
import { Markdown } from "@/components/docs/markdown";
import { CodeBlock } from "@/components/docs/code-block";
import { PropsTable } from "@/components/docs/props-table";
import { FunctionDocs } from "@/components/docs/function-docs";
import { TabPage } from "@/components/docs/tab-page";
import { VersionBanner } from "@/components/docs/version-banner";
import { getClassName } from "@behivetech/bht-class-names";
import type { CatalogComponent, HistoryEntry } from "@/lib/catalog/types";
import overviewStyles from "../../page.module.scss";
import changelogStyles from "../../changelog/page.module.scss";

interface Props {
  params: Promise<VersionParams>;
}

/**
 * Static export: every page under /v is listed here — the versions index
 * always, then an overview and each tab per snapshot — and anything else is
 * the host's 404 page.
 */
export const dynamicParams = false;
export const generateStaticParams = versionParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const component = getComponent(resolved.scope, resolved.category, resolved.name);
  const parsed = parseVersionSegments(resolved.version);
  if (!component || parsed.kind === "unknown") return {};
  if (parsed.kind === "index") {
    return { title: `${component.title} versions · @${component.scope}` };
  }
  const { snapshot } = resolveSnapshot(resolved, parsed.slug);
  return {
    title: `${component.title} v${snapshot.version} · @${component.scope}`,
    description: snapshot.summary || component.summary,
  };
}

/**
 * The pages of past versions, one route: `/v` lists every snapshot of the
 * component, `/v/<token>` is the overview as it stood at that version, and
 * `/v/<token>/<tab>` its Examples (as code), Code or Changelog. Only the
 * current version's build exists in the sandbox, so nothing here runs live.
 */
export default async function VersionPage({ params }: Props) {
  const resolved = await params;
  const parsed = parseVersionSegments(resolved.version);
  if (parsed.kind === "unknown") notFound();
  if (parsed.kind === "index") {
    const component = getComponent(resolved.scope, resolved.category, resolved.name);
    if (!component) notFound();
    return <VersionsIndex component={component} base={`/${resolved.scope}/${resolved.category}/${resolved.name}`} />;
  }
  const { component, snapshot, base } = resolveSnapshot(resolved, parsed.slug);
  const banner = (
    <VersionBanner
      base={base}
      title={component.title}
      version={snapshot.version}
      current={component.version}
      date={snapshot.date}
    />
  );
  switch (parsed.tab) {
    case "/examples":
      return <SnapshotExamples snapshot={snapshot} base={base} banner={banner} />;
    case "/code":
      return <SnapshotCode component={component} snapshot={snapshot} banner={banner} />;
    case "/changelog":
      return <SnapshotChangelog snapshot={snapshot} banner={banner} />;
    default:
      return <SnapshotOverview snapshot={snapshot} base={base} banner={banner} />;
  }
}

/** Every snapshot of the component, newest first, with its date — or the one line that says there is none yet. */
function VersionsIndex({ component, base }: { component: CatalogComponent; base: string }) {
  const entries = getHistory(component.packageName);
  return (
    <TabPage>
      <section>
        <h2>Versions</h2>
        {entries.length === 0 ? (
          <TabPage.Note>
            No past versions have been snapshotted yet. The first{" "}
            <code>pnpm version-packages</code> after a change to{" "}
            <code>{component.packageName}</code> records one; the current docs
            are <Link href={base}>on the live page</Link>.
          </TabPage.Note>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li key={entry.version}>
                <Link href={versionedPath(base, entry.version)}>v{entry.version}</Link>
                {entry.version === component.version ? " (current)" : ""} · snapshotted {entry.date}
              </li>
            ))}
          </ul>
        )}
      </section>
    </TabPage>
  );
}

function SnapshotOverview({
  snapshot,
  base,
  banner,
}: {
  snapshot: HistoryEntry;
  base: string;
  banner: React.ReactNode;
}) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ComponentOverview",
    styles: overviewStyles,
  });
  return (
    <div className={rootClass}>
      {banner}
      <section>
        {snapshot.readme ? (
          // Fences stay code: only the current build can run.
          <Markdown liveFences="opt-in">{snapshot.readme}</Markdown>
        ) : (
          <p>This version had no README.</p>
        )}
      </section>

      {snapshot.examples.length > 0 && (
        <section>
          <div className={getChildClass("section-head")}>
            <h2>Examples</h2>
            <Link href={versionedPath(base, snapshot.version, "/examples")}>
              Open all {snapshot.examples.length} →
            </Link>
          </div>
          <div className={getChildClass("gallery")}>
            {snapshot.examples.slice(0, 2).map((example) => (
              <CodeBlock key={example.name} title={example.title} code={example.code} />
            ))}
          </div>
        </section>
      )}

      {snapshot.docs.length > 0 && (
        <section>
          <h2>Properties</h2>
          {snapshot.docs.map((doc) => (
            <PropsTable key={doc.displayName} doc={doc} />
          ))}
        </section>
      )}

      {snapshot.functions.length > 0 && (
        <section>
          <h2>{snapshot.functions.every((fn) => fn.kind === "hook") ? "Hooks" : "Functions"}</h2>
          {snapshot.functions.map((fn) => (
            <FunctionDocs key={fn.name} fn={fn} />
          ))}
        </section>
      )}

      {snapshot.docs.length === 0 && snapshot.functions.length === 0 && (
        <section>
          <h2>Properties</h2>
          <p>Nothing was documented at this version.</p>
        </section>
      )}
    </div>
  );
}

function SnapshotExamples({
  snapshot,
  base,
  banner,
}: {
  snapshot: HistoryEntry;
  base: string;
  banner: React.ReactNode;
}) {
  return (
    <TabPage>
      {banner}
      <TabPage.Note>
        Examples of v{snapshot.version} are shown as code; only the latest
        version runs live. <Link href={`${base}/examples`}>Open the live examples →</Link>
      </TabPage.Note>
      {snapshot.examples.length === 0 ? (
        <TabPage.Note>This version shipped no examples.</TabPage.Note>
      ) : (
        snapshot.examples.map((example) => (
          <div key={example.name}>
            {example.description && <TabPage.Note>{example.description}</TabPage.Note>}
            <CodeBlock title={example.title} code={example.code} />
          </div>
        ))
      )}
    </TabPage>
  );
}

function SnapshotCode({
  component,
  snapshot,
  banner,
}: {
  component: CatalogComponent;
  snapshot: HistoryEntry;
  banner: React.ReactNode;
}) {
  return (
    <TabPage>
      {banner}
      <TabPage.Note>
        <code>{component.sourcePath}</code> at v{snapshot.version}, snapshotted {snapshot.date}
      </TabPage.Note>
      {snapshot.files.map((file) => (
        <CodeBlock
          key={file.path}
          title={file.path}
          code={file.content}
          language={file.language === "markdown" ? "markdown" : file.language}
        />
      ))}
    </TabPage>
  );
}

function SnapshotChangelog({ snapshot, banner }: { snapshot: HistoryEntry; banner: React.ReactNode }) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ChangelogPage",
    styles: changelogStyles,
  });
  return (
    <TabPage>
      {banner}
      <section>
        <h2>Changelog up to v{snapshot.version}</h2>
        {snapshot.releases.length === 0 ? (
          <TabPage.Note>
            No release notes up to v{snapshot.version}: the package had not been
            through <code>pnpm changeset</code> yet.
          </TabPage.Note>
        ) : (
          <div className={rootClass}>
            {snapshot.releases.map((release) => (
              <article key={release.version} className={getChildClass("release")}>
                <h3>v{release.version}</h3>
                {/* Fences stay code on a snapshot, as on its overview. */}
                <Markdown liveFences="opt-in">{release.notes}</Markdown>
              </article>
            ))}
          </div>
        )}
      </section>
    </TabPage>
  );
}
