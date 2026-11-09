import Link from "next/link";
import type { Metadata } from "next";
import { resolveSnapshot, versionParams, type VersionParams } from "@/lib/history";
import { Markdown } from "@/components/docs/markdown";
import { CodeBlock } from "@/components/docs/code-block";
import { PropsTable } from "@/components/docs/props-table";
import { FunctionDocs } from "@/components/docs/function-docs";
import { VersionBanner } from "@/components/docs/version-banner";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "../../page.module.scss";

interface Props {
  params: Promise<VersionParams>;
}

export const dynamicParams = false;
export const generateStaticParams = versionParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { component, snapshot } = resolveSnapshot(await params);
  return {
    title: `${component.title} v${snapshot.version} · @${component.scope}`,
    description: snapshot.summary || component.summary,
  };
}

/**
 * The overview as it stood at this version: the README of the time (its code
 * fences stay code, since only the current build can run), the examples as
 * source, and the props and function docs from the snapshot's docs.json.
 */
export default async function VersionOverviewPage({ params }: Props) {
  const { component, snapshot, base } = resolveSnapshot(await params);
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ComponentOverview",
    styles,
  });

  return (
    <div className={rootClass}>
      <VersionBanner
        base={base}
        title={component.title}
        version={snapshot.version}
        current={component.version}
        date={snapshot.date}
      />
      <section>
        {snapshot.readme ? (
          <Markdown liveFences="opt-in">{snapshot.readme}</Markdown>
        ) : (
          <p>This version had no README.</p>
        )}
      </section>

      {snapshot.examples.length > 0 && (
        <section>
          <div className={getChildClass("section-head")}>
            <h2>Examples</h2>
            <Link href={`${base}/examples/v/${snapshot.version}`}>
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
          <h2>
            {snapshot.functions.every((fn) => fn.kind === "hook") ? "Hooks" : "Functions"}
          </h2>
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
