"use client";

import type { CSSProperties } from "react";
import { Badge } from "@behivetech/atoms.badge";
import { Button } from "@behivetech/atoms.button";
import { Card } from "@behivetech/atoms.card";
import { TextField } from "@behivetech/atoms.text-field";
import { getClassName } from "@behivetech/bht-class-names";
import { ROLES, roleToken, type SchemeColors, type Theme } from "@/lib/theme/scheme";
import styles from "./theme-preview.module.scss";

/**
 * The generated roles as custom properties on one element. This is the one
 * place the builder sets styles inline: the values are computed at runtime
 * from the visitor's seeds, so no stylesheet can know them. Everything inside
 * the panel — real registry components — reads them the way it reads the
 * token sheet.
 */
const schemeVars = (colors: SchemeColors): CSSProperties =>
  Object.fromEntries(ROLES.map((role) => [roleToken(role), colors[role]])) as CSSProperties;

/** The same sample chrome under the light and the dark scheme, side by side. */
export function ThemePreview({ theme }: { theme: Theme }) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ThemePreview",
    styles,
  });
  return (
    <section className={rootClass} aria-labelledby="theme-preview">
      <h2 id="theme-preview">Preview</h2>
      <div className={getChildClass("panels")}>
        {(["light", "dark"] as const).map((scheme) => (
          <div
            key={scheme}
            className={getChildClass("panel")}
            data-scheme={scheme}
            style={schemeVars(theme[scheme])}
          >
            <p className={getChildClass("caption")}>{scheme} scheme</p>
            <Card title="Order summary" headingLevel={3} padding="md" action={<Badge variant="primary">New</Badge>}>
              <p className={getChildClass("body")}>
                Three items ship tomorrow. Primary text sits on the surface;
                secondary and tertiary accents carry the badges.
              </p>
              <div className={getChildClass("row")}>
                <Badge variant="success">Stable</Badge>
                <Badge variant="info">Beta</Badge>
                <Badge variant="warning">Deprecated</Badge>
                <Badge variant="error">Error</Badge>
              </div>
              <TextField placeholder="Search components" aria-label="Sample text field" />
              <div className={getChildClass("row")}>
                <Button variant="primary">Primary action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
