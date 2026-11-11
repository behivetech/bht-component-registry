import Link from "next/link";
import { getClassName } from "@behivetech/bht-class-names";
import { Badge } from "@behivetech/atoms.badge";
import { Card } from "@behivetech/atoms.card";
import type { ComponentCardModel } from "@/lib/catalog/card-model";
import { StatusBadge } from "./status-badge";
import styles from "./component-card.module.scss";

const NO_PREVIEW_TEXT = {
  overlay: "Opens as an overlay — see its examples",
  function: "No visual preview — see its signatures and examples",
  failed: "No preview",
};

/** Which placeholder a tile with no thumbnail shows. */
const noPreviewReason = (
  component: ComponentCardModel,
): keyof typeof NO_PREVIEW_TEXT => {
  const isFunction =
    component.category === "hooks" || component.category === "utils";
  // A hook or util is never an overlay, even when its package opts out of the
  // tile with `preview.thumbnail: false`: its placeholder says so.
  let reason: keyof typeof NO_PREVIEW_TEXT = "failed";
  if (isFunction) reason = "function";
  else if (component.thumbnailKind === "overlay") reason = "overlay";
  return reason;
};

/**
 * One tile in a scope's catalog: a thumbnail of the first example, the name,
 * version and summary. The thumbnail is the real component rendered to static
 * markup when the site is built, so it is never a stale screenshot and the
 * browser loads no component code for it.
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
        {component.thumbnailHtml ? (
          <div
            className={getChildClass("thumb-example")}
            // Markup this build rendered from our own registry (see
            // scripts/lib/thumbnails.ts), never user input.
            dangerouslySetInnerHTML={{ __html: component.thumbnailHtml }}
          />
        ) : (
          <span className={getChildClass("no-preview")}>
            {NO_PREVIEW_TEXT[noPreviewReason(component)]}
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
