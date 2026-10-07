import Link from "next/link";
import { Card } from "@/ui/card";
import type { ComponentCardModel } from "@/lib/catalog/card-model";
import { LiveExample } from "./live-example";
import { StatusBadge } from "./status-badge";
import styles from "./component-card.module.scss";

/**
 * One tile in a scope's catalog: a live thumbnail of the first composition,
 * the name, version and summary. Rendering the real component instead of a
 * screenshot means the tile is never stale.
 */
export function ComponentCard({ component }: { component: ComponentCardModel }) {
  const href = `/${component.scope}/${component.category}/${component.name}`;
  return (
    <Card className={styles.card} padding="none">
      {/* A decorative preview: its headings, buttons and inputs must not
          reach assistive tech or the tab order — the card's link is the
          one interactive thing here. */}
      <div className={styles.thumb} aria-hidden inert>
        {component.thumbnailCode ? (
          <LiveExample code={component.thumbnailCode} noInline previewOnly className={styles.thumbExample} />
        ) : (
          <span className={styles.noPreview}>Opens as an overlay — see its compositions</span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <Link href={href} className={styles.title}>
            {component.title}
          </Link>
          <span className={styles.version}>v{component.version}</span>
        </div>
        <p className={styles.summary}>{component.summary}</p>
        <div className={styles.footer}>
          <code className={styles.package}>{component.packageName}</code>
          {component.status !== "STABLE" && <StatusBadge status={component.status} size="sm" />}
        </div>
      </div>
    </Card>
  );
}
