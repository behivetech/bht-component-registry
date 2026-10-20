import { getClassName } from "@bht-component-registry/class-names";
import { Table, type TableColumn } from "@behivetech/atoms.table";
import type { CatalogDocComponent, CatalogProp } from "@/lib/catalog";
import styles from "./props-table.module.scss";

const [rootClass, getChildClass] = getClassName({
  rootClass: "PropsTable",
  styles,
});

const columns: TableColumn<CatalogProp>[] = [
  {
    key: "name",
    title: "Prop",
    render: (_, prop) => (
      <code className={getChildClass("name")}>
        {prop.name}
        {prop.required && (
          <span className={getChildClass("required")} title="Required">
            *
          </span>
        )}
      </code>
    ),
  },
  {
    key: "type",
    title: "Type",
    render: (_, prop) => (
      <code className={getChildClass("type")}>{prop.type}</code>
    ),
  },
  {
    key: "default",
    title: "Default",
    render: (_, prop) =>
      prop.defaultValue !== null ? (
        <code>{prop.defaultValue}</code>
      ) : (
        <span className={getChildClass("muted")}>—</span>
      ),
  },
  {
    key: "description",
    title: "Description",
    render: (_, prop) =>
      prop.description || <span className={getChildClass("muted")}>—</span>,
  },
];

/**
 * The props table, straight from react-docgen-typescript's read of the
 * component's TypeScript: names, types, defaults and the JSDoc above each
 * prop. Nothing here is written by hand, so it can't drift from the code.
 */
export function PropsTable({ doc }: { doc: CatalogDocComponent }) {
  return (
    <section className={rootClass}>
      <h3 className={getChildClass("heading")}>
        <code>{doc.displayName}</code> props
      </h3>
      {doc.props.length === 0 ? (
        <p className={getChildClass("muted")}>No props of its own.</p>
      ) : (
        <Table
          columns={columns}
          data={doc.props}
          rowKey={(prop) => prop.name}
        />
      )}
      {doc.extendsNative && (
        <p className={getChildClass("note")}>
          Also accepts the native attributes of its root element (className,
          aria-*, event handlers, …).
        </p>
      )}
    </section>
  );
}
