import { getClassName } from "@bht-component-registry/class-names";
import { Table, type TableColumn } from "@/ui/table";
import type { CatalogDocFunction, CatalogDocParam } from "@/lib/catalog";
import { CodeBlock } from "./code-block";
import styles from "./function-docs.module.scss";

const [rootClass, getChildClass] = getClassName({
  rootClass: "FunctionDocs",
  styles,
});

const columns: TableColumn<CatalogDocParam>[] = [
  {
    key: "name",
    title: "Parameter",
    render: (_, param) => (
      <code className={getChildClass("name")}>
        {param.name}
        {param.optional && <span className={getChildClass("muted")}>?</span>}
      </code>
    ),
  },
  {
    key: "type",
    title: "Type",
    render: (_, param) => (
      <code className={getChildClass("type")}>{param.type}</code>
    ),
  },
  {
    key: "description",
    title: "Description",
    render: (_, param) =>
      param.description || <span className={getChildClass("muted")}>—</span>,
  },
];

/**
 * A hook or utility function, straight from its TypeScript and JSDoc: every
 * call signature with its parameters (and their `@param` text), what it
 * returns (and `@returns`), and the `@example` blocks as code. Hooks also get
 * live examples from their compositions, the way components do.
 */
export function FunctionDocs({ fn }: { fn: CatalogDocFunction }) {
  return (
    <section className={rootClass}>
      <h3 className={getChildClass("heading")}>
        <code>{fn.name}</code>
        <span className={getChildClass("muted")}>
          {" "}
          {fn.kind === "hook" ? "hook" : "function"}
        </span>
      </h3>
      {fn.description && <p>{fn.description}</p>}
      {fn.signatures.map((signature) => (
        <div key={signature.text}>
          <pre className={getChildClass("signature")}>
            <code>{signature.text}</code>
          </pre>
          {signature.params.length > 0 && (
            <Table
              columns={columns}
              data={signature.params}
              rowKey={(param) => param.name}
            />
          )}
          <p className={getChildClass("note")}>
            Returns <code>{signature.returns.type}</code>
            {signature.returns.description && (
              <> — {signature.returns.description}</>
            )}
          </p>
        </div>
      ))}
      {fn.examples.map((example, index) => (
        <CodeBlock key={index} code={example} language="tsx" title="Example" />
      ))}
    </section>
  );
}
