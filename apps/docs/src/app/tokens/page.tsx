import { notFound } from "next/navigation";
import { Table, type TableColumn } from "@behivetech/atoms.table";
import { catalog, type CatalogTokens } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./page.module.scss";

const [rootClass, getChildClass] = getClassName({
  rootClass: "TokensPage",
  styles,
});

export const metadata = { title: "Design tokens" };

type ColorRole = CatalogTokens["colorRoles"][number];
type Typescale = CatalogTokens["typescale"][number];

const colorColumns: TableColumn<ColorRole>[] = [
  {
    key: "role",
    title: "Role",
    render: (_, row) => <code>--md-sys-color-{row.role}</code>,
  },
  {
    key: "light",
    title: "Light",
    render: (_, row) => (
      <span className={getChildClass("swatch-cell")}>
        <span
          className={getChildClass("swatch")}
          style={{ background: row.light }}
          aria-hidden
        />{" "}
        <code>{row.light}</code>
      </span>
    ),
  },
  {
    key: "dark",
    title: "Dark",
    render: (_, row) => (
      <span className={getChildClass("swatch-cell")}>
        <span
          className={getChildClass("swatch")}
          style={{ background: row.dark }}
          aria-hidden
        />{" "}
        <code>{row.dark}</code>
      </span>
    ),
  },
];

const typeColumns: TableColumn<Typescale>[] = [
  { key: "name", title: "Style", render: (_, row) => <code>{row.name}</code> },
  { key: "size", title: "Size", dataIndex: "size" },
  { key: "lineHeight", title: "Line height", dataIndex: "lineHeight" },
  { key: "weight", title: "Weight", dataIndex: "weight" },
  {
    key: "sample",
    title: "Sample",
    render: (_, row) => (
      <span
        style={{
          fontSize: `var(--md-sys-typescale-${row.name}-size)`,
          fontWeight: `var(--md-sys-typescale-${row.name}-weight)` as never,
        }}
      >
        The quick brown fox
      </span>
    ),
  },
];

/**
 * The design-token sheet a scope declares in its scope.json
 * (`"tokens": "theme/base-styles/tokens.scss"`), extracted at build time into
 * the catalog so this page and the file can't disagree. The declaration is
 * optional: when no scope has one, `catalog.tokens` is null, the header hides
 * the link, and this route is not part of the export.
 */
export default function TokensPage() {
  const tokens = catalog.tokens;
  if (!tokens) notFound();
  const { colorRoles, typescale, shapes } = tokens;

  return (
    <>
      <SiteHeader />
      <main className={rootClass}>
        <h1>Design tokens</h1>
        <p className={getChildClass("lead")}>
          Components style themselves from <code>--md-sys-*</code> custom
          properties. Override a handful of roles on any element and everything
          inside re-themes.
        </p>
        {catalog.site.design && (
          <p className={getChildClass("lead")}>
            <a href={catalog.site.design.url} target="_blank" rel="noreferrer">
              {catalog.site.design.kind === "figma"
                ? "Variables in Figma"
                : catalog.site.design.label}{" "}
              ↗
            </a>
          </p>
        )}

        <section>
          <h2>Color roles</h2>
          <Table
            columns={colorColumns}
            data={colorRoles}
            rowKey={(row) => row.role}
          />
        </section>

        <section>
          <h2>Typescale</h2>
          <Table
            columns={typeColumns}
            data={typescale}
            rowKey={(row) => row.name}
          />
        </section>

        <section>
          <h2>Shape</h2>
          <div className={getChildClass("shapes")}>
            {shapes.map((shape) => (
              <div key={shape.name} className={getChildClass("shape")}>
                <div
                  className={getChildClass("shape-sample")}
                  style={{ borderRadius: shape.value }}
                />
                <code>{shape.name}</code>
                <span className={getChildClass("muted")}>{shape.value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
