import { notFound } from "next/navigation";
import { catalog, getComponent } from "@/lib/catalog";
import styles from "./page.module.scss";
import shared from "../page.module.scss";

interface Props {
  params: Promise<{ scope: string; category: string; name: string }>;
}

/**
 * Where the component's design lives: the links its package.json declares
 * under `registry.design`. A Figma link becomes an embedded frame when the
 * site opts in (`site.embedDesigns`) — a third-party iframe, so it is off by
 * default — and a link card otherwise; any other URL is always a card.
 */
export default async function DesignPage({ params }: Props) {
  const { scope, category, name } = await params;
  const component = getComponent(scope, category, name);
  if (!component) notFound();

  if (component.design.length === 0) {
    return (
      <p className={shared.muted}>
        No design links yet. Add <code>{'"registry": { "design": [{ "label": "Figma", "url": "…" }] }'}</code> to the package.json.
      </p>
    );
  }

  const embed = catalog.site.embedDesigns;

  return (
    <div className={shared.stack}>
      {component.design.map((link) => (
        <section key={link.url} className={styles.link}>
          <div className={styles.bar}>
            <span className={styles.label}>{link.label}</span>
            <a className={styles.open} href={link.url} target="_blank" rel="noreferrer">
              Open in {link.kind === "figma" ? "Figma" : "a new tab"} ↗
            </a>
          </div>
          {link.kind === "figma" && embed && link.embedUrl ? (
            <iframe className={styles.embed} src={link.embedUrl} title={`${link.label} — ${component.title}`} allowFullScreen />
          ) : (
            <p className={styles.url}>
              <code>{link.url}</code>
            </p>
          )}
        </section>
      ))}
      {!embed && component.design.some((link) => link.kind === "figma") && (
        <p className={shared.muted}>
          Figma links can be shown as embedded frames: set <code>site.embedDesigns</code> to <code>true</code> in{" "}
          <code>registry.config.json</code>. The file has to be visible to whoever views this site.
        </p>
      )}
    </div>
  );
}
