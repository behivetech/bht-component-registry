import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { CodeBlock } from "@/components/docs/code-block";
import { TabPage } from "@/components/docs/tab-page";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/** The package's own source files — component, styles, exports, compositions, tests. */
export default async function CodePage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  return (
    <TabPage>
      <TabPage.Note>
        <code>{component.sourcePath}</code>
        {component.dependencies.length > 0 && (
          <>
            {" "}
            · depends on{" "}
            {component.dependencies
              .map((dep) => <code key={dep}>{dep}</code>)
              .reduce<React.ReactNode[]>(
                (acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]),
                [],
              )}
          </>
        )}
      </TabPage.Note>
      {component.files.map((file) => (
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
