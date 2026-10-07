import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { LiveExample } from "@/components/docs/live-example";
import styles from "../page.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/** A blank sandbox with the whole registry in scope, seeded with the first composition. */
export default async function PlaygroundPage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  const starter =
    component.examples[0]?.code ??
    `const Example = () => <${component.exportNames[0] ?? "div"} />;\n\nrender(<Example />);\n`;

  return (
    <div className={styles.stack}>
      <p className={styles.muted}>
        Edit the code and the preview updates as you type. Every registry export is in scope — <code>{component.exportNames.join(", ")}</code>
        {component.exportNames.length > 0 ? " from this package, " : ""}plus React hooks and every other component in the registry.
      </p>
      <LiveExample code={starter} noInline editorOpen title="Playground" />
    </div>
  );
}
