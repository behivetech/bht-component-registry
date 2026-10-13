import { Table, type TableColumn } from "@/ui/table";
import type { CatalogDocFunction, CatalogDocParam } from "@/lib/catalog";
import { CodeBlock } from "./code-block";
import styles from "./props-table.module.scss";

const columns: TableColumn<CatalogDocParam>[] = [
  {
    key: "name",
    title: "Parameter",
    render: (_, param) => (
      <code className={styles.name}>
        {param.name}
        {param.optional && <span className={styles.muted}>?</span>}
      </code>
    ),
  },
  { key: "type", title: "Type", render: (_, param) => <code className={styles.type}>{param.type}</code> },
  { key: "description", title: "Description", render: (_, param) => param.description || <span className={styles.muted}>—</span> },
];

/**
 * A hook or utility function, straight from its TypeScript and JSDoc: every
 * call signature with its parameters (and their `@param` text), what it
 * returns (and `@returns`), and the `@example` blocks as code. Hooks also get
 * live examples from their compositions, the way components do.
 */
export function FunctionDocs({ fn }: { fn: CatalogDocFunction }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>
        <code>{fn.name}</code>
        <span className={styles.muted}> {fn.kind === "hook" ? "hook" : "function"}</span>
      </h3>
      {fn.description && <p>{fn.description}</p>}
      {fn.signatures.map((signature) => (
        <div key={signature.text}>
          <pre className={styles.signature}>
            <code>{signature.text}</code>
          </pre>
          {signature.params.length > 0 && <Table columns={columns} data={signature.params} rowKey={(param) => param.name} />}
          <p className={styles.note}>
            Returns <code>{signature.returns.type}</code>
            {signature.returns.description && <> — {signature.returns.description}</>}
          </p>
        </div>
      ))}
      {fn.examples.map((example, index) => (
        <CodeBlock key={index} code={example} language="tsx" title="Example" />
      ))}
    </section>
  );
}
