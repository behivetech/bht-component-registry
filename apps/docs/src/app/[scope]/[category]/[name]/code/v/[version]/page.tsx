import { resolveSnapshot, versionParams, type VersionParams } from "@/lib/history";
import { CodeBlock } from "@/components/docs/code-block";
import { TabPage } from "@/components/docs/tab-page";
import { VersionBanner } from "@/components/docs/version-banner";

interface Props {
  params: Promise<VersionParams>;
}

export const dynamicParams = false;
export const generateStaticParams = versionParams;

/** The package's source as it was at this version — what the snapshot copied. */
export default async function VersionCodePage({ params }: Props) {
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
        <code>{component.sourcePath}</code> at v{snapshot.version}, snapshotted{" "}
        {snapshot.date}
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
