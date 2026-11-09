import Link from "next/link";
import { resolveSnapshot, versionParams, type VersionParams } from "@/lib/history";
import { CodeBlock } from "@/components/docs/code-block";
import { TabPage } from "@/components/docs/tab-page";
import { VersionBanner } from "@/components/docs/version-banner";

interface Props {
  params: Promise<VersionParams>;
}

export const dynamicParams = false;
export const generateStaticParams = versionParams;

/**
 * The examples of a past version, as code. Only the current version's build
 * is in the sandbox, so an old example is shown rather than run; the latest
 * version's Examples tab runs them live.
 */
export default async function VersionExamplesPage({ params }: Props) {
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
      <TabPage.Note>
        Examples of v{snapshot.version} are shown as code; only the latest
        version runs live.{" "}
        <Link href={`${base}/examples`}>Open the live examples →</Link>
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
