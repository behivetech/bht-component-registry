import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { isOverlayComponent } from "@/lib/catalog/card-model";
import { LiveExample } from "@/components/docs/live-example";
import { TabPage } from "@/components/docs/tab-page";

/** An overlay opens inside its preview frame; give it a frame worth opening in. */
const OVERLAY_PREVIEW_HEIGHT = 360;

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/**
 * Every composition, rendered live with its source editable. Compositions
 * are the component's own `*.composition.tsx` exports — the same files a
 * developer writes to try the component while building it.
 */
export default async function CompositionsPage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  if (component.examples.length === 0) {
    return (
      <TabPage.Note>
        No compositions yet. Add exports to a <code>*.composition.tsx</code>{" "}
        file in the package.
      </TabPage.Note>
    );
  }

  const minHeight = isOverlayComponent(component)
    ? OVERLAY_PREVIEW_HEIGHT
    : undefined;

  return (
    <TabPage>
      {component.examples.map((example) => (
        <div key={example.name}>
          {example.description && (
            <TabPage.Note>{example.description}</TabPage.Note>
          )}
          <LiveExample
            code={example.code}
            noInline
            title={example.title}
            minHeight={minHeight}
          />
        </div>
      ))}
    </TabPage>
  );
}
