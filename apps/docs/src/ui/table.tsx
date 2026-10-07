// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { type ReactNode } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./table.module.scss";

export interface TableColumn<TRow> {
  /** Unique identity for this column; also used as the header cell's React key */
  key: string;
  /** Column header content */
  title: ReactNode;
  /** Reads a raw field off each row for this column, when no custom `render` is given */
  dataIndex?: keyof TRow;
  /** Renders a cell's content. Receives `row[dataIndex]` as `value` when `dataIndex` is set. */
  render?: (value: unknown, row: TRow) => ReactNode;
  /** Additional class name applied to every cell (header and body) in this column */
  className?: string;
}

export interface TableProps<TRow> {
  /** Column definitions, rendered left to right */
  columns: TableColumn<TRow>[];
  /** Rows to render, in the order given — Table does not sort, paginate, or filter */
  data: TRow[];
  /** Returns a stable, unique key for a row, used as its React key */
  rowKey: (row: TRow) => string;
  /** Additional class names to merge with the component root element */
  className?: string;
}

/**
 * A bare data table — describe `columns` once (each with a `title` and either a
 * `dataIndex` or a custom `render`), pass `data`, get a `<table>` back. No sorting,
 * pagination, or empty-state handling — those are the consuming page's concern.
 */
export const Table = <TRow,>({ columns, data, rowKey, className }: TableProps<TRow>) => {
  const [rootClass] = getClassName({
    className,
    rootClass: "BHT__Table",
    styles,
  });

  return (
    <table className={rootClass}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={column.className}>
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column) => {
              const value = column.dataIndex ? row[column.dataIndex] : undefined;
              return (
                <td key={column.key} className={column.className}>
                  {column.render ? column.render(value, row) : value !== undefined ? String(value) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
