import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { isOverlayComponent } from "@/lib/catalog/card-model";
import { LiveExample } from "@/components/docs/live-example";
import styles from "../page.module.scss";

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
    return <p className={styles.muted}>No compositions yet. Add exports to a <code>*.composition.tsx</code> file in the package.</p>;
  }

  const minHeight = isOverlayComponent(component) ? OVERLAY_PREVIEW_HEIGHT : undefined;

  return (
    <div className={styles.stack}>
      {component.examples.map((example) => (
        <div key={example.name}>
          {example.description && <p className={styles.muted}>{example.description}</p>}
          <LiveExample code={example.code} noInline title={example.title} minHeight={minHeight} />
        </div>
      ))}
    </div>
  );
}
