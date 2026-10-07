import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { Markdown } from "@/components/docs/markdown";
import { LiveExample } from "@/components/docs/live-example";
import { PropsTable } from "@/components/docs/props-table";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/** Overview: the README (with live snippets), a compositions gallery, and the props tables. */
export default async function OverviewPage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  const base = `/${scope}/${category}/${name}`;

  return (
    <div className={styles.overview}>
      <section>
        {component.readme ? <Markdown>{component.readme}</Markdown> : <p>This component has no README yet.</p>}
      </section>

      {component.examples.length > 0 && (
        <section>
          <div className={styles.sectionHead}>
            <h2>Compositions</h2>
            <Link href={`${base}/compositions`}>Open all {component.examples.length} →</Link>
          </div>
          <div className={styles.gallery}>
            {component.examples.slice(0, 6).map((example) => (
              <LiveExample key={example.name} code={example.code} noInline title={example.title} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Properties</h2>
        {component.docs.length === 0 ? (
          <p>No component props were found — this package exports utilities rather than components.</p>
        ) : (
          component.docs.map((doc) => <PropsTable key={doc.displayName} doc={doc} />)
        )}
      </section>
    </div>
  );
}
