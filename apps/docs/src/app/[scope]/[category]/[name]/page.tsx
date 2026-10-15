import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponent } from "@/lib/catalog";
import { Markdown } from "@/components/docs/markdown";
import { LiveExample } from "@/components/docs/live-example";
import { PropsTable } from "@/components/docs/props-table";
import { FunctionDocs } from "@/components/docs/function-docs";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/** Overview: the README (with live snippets), a compositions gallery, and the props tables. */
export default async function OverviewPage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  const base = `///`;
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ComponentOverview",
    styles,
  });

  return (
    <div className={rootClass}>
      <section>
        {component.readme ? (
          <Markdown>{component.readme}</Markdown>
        ) : (
          <p>This component has no README yet.</p>
        )}
      </section>

      {component.examples.length > 0 && (
        <section>
          <div className={getChildClass("section-head")}>
            <h2>Compositions</h2>
            <Link href={`${base}/compositions`}>
              Open all {component.examples.length} →
            </Link>
          </div>
          <div className={getChildClass("gallery")}>
            {component.examples.slice(0, 6).map((example) => (
              <LiveExample
                key={example.name}
                code={example.code}
                noInline
                title={example.title}
              />
            ))}
          </div>
        </section>
      )}

      {component.docs.length > 0 && (
        <section>
          <h2>Properties</h2>
          {component.docs.map((doc) => (
            <PropsTable key={doc.displayName} doc={doc} />
          ))}
        </section>
      )}

      {component.functions.length > 0 && (
        <section>
          <h2>
            {component.functions.every((fn) => fn.kind === "hook")
              ? "Hooks"
              : "Functions"}
          </h2>
          {component.functions.map((fn) => (
            <FunctionDocs key={fn.name} fn={fn} />
          ))}
        </section>
      )}

      {component.docs.length === 0 && component.functions.length === 0 && (
        <section>
          <h2>Properties</h2>
          <p>
            Nothing documented yet: no exported component with a props
            interface, and no exported function with a JSDoc comment.
          </p>
        </section>
      )}
    </div>
  );
}
