import Link from "next/link";
import { getClassName } from "@bht-component-registry/class-names";
import { Badge } from "@behivetech/atoms.badge";
import { Card } from "@behivetech/atoms.card";
import type { ComponentCardModel } from "@/lib/catalog/card-model";
import { LiveExample } from "./live-example";
import { StatusBadge } from "./status-badge";
import styles from "./component-card.module.scss";

/**
 * One tile in a scope's catalog: a live thumbnail of the first example,
 * the name, version and summary. Rendering the real component instead of a
 * screenshot means the tile is never stale.
 */
export function ComponentCard({
  component,
}: {
  component: ComponentCardModel;
}) {
  const href = `/${component.scope}/${component.category}/${component.name}`;
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ComponentCard",
    styles,
  });
  return (
    <Card className={rootClass} padding="none">
      {/* A decorative preview: its headings, buttons and inputs must not
          reach assistive tech or the tab order — the card's link is the
          one interactive thing here. */}
      <div className={getChildClass("thumb")} aria-hidden inert>
        {component.thumbnailCode ? (
          <LiveExample
            code={component.thumbnailCode}
            noInline
            previewOnly
            className={getChildClass("thumb-example")}
          />
        ) : (
          <span className={getChildClass("no-preview")}>
            {component.category === "hooks" || component.category === "utils"
              ? "No visual preview — see its signatures and examples"
              : "Opens as an overlay — see its examples"}
          </span>
        )}
      </div>
      <div className={getChildClass("body")}>
        <div className={getChildClass("title-row")}>
          <Link href={href} className={getChildClass("title")}>
            {component.title}
          </Link>
          <span className={getChildClass("version")}>v{component.version}</span>
        </div>
        <p className={getChildClass("summary")}>{component.summary}</p>
        <div className={getChildClass("footer")}>
          <code className={getChildClass("package")}>
            {component.packageName}
          </code>
          {component.status !== "STABLE" && (
            <StatusBadge status={component.status} size="sm" />
          )}
          {component.visibility === "private" && (
            <Badge variant="default" size="sm">
              Private
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
