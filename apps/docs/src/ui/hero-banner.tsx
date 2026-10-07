// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { type ReactNode } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./hero-banner.module.scss";

/** One call-to-action link in `ctaButtons`. */
export interface HeroBannerCta {
  /** Link text; a button with no label is skipped */
  label?: string;
  /** Destination URL; a button with no href is skipped */
  href?: string;
  /** Visual weight — the first button usually leads, the rest support */
  variant?: "primary" | "secondary";
}

export interface HeroBannerProps {
  /** Main heading text */
  headline?: string;
  /** Supporting text shown below the headline */
  subtext?: string;
  /** Background image URL rendered behind the content */
  imageUrl?: string;
  /** Label for the call-to-action link; requires `ctaHref` to render. Superseded by `ctaButtons` */
  ctaLabel?: string;
  /** Destination URL for the call-to-action link; requires `ctaLabel` to render. Superseded by `ctaButtons` */
  ctaHref?: string;
  /** Call-to-action links. When present these render instead of `ctaLabel`/`ctaHref` */
  ctaButtons?: HeroBannerCta[];
  /** Horizontal alignment of the content; defaults to center */
  align?: "left" | "center" | "right";
  /** Additional class names to merge with the component root element */
  className?: string;
  /** Additional content rendered after the CTA */
  children?: ReactNode;
}

export const HeroBanner = ({
  headline,
  subtext,
  imageUrl,
  ctaLabel,
  ctaHref,
  ctaButtons,
  align = "center",
  className,
  children,
}: HeroBannerProps) => {
  const [rootClass, getChildClass] = getClassName({
    className,
    rootClass: "BHT__hero-banner",
    modifiers: { [`align-${align}`]: true },
    styles,
  });

  // Half-filled CTAs (a label with no URL yet) are skipped rather than rendered
  // as a dead link. Falling back to ctaLabel/ctaHref keeps the older
  // single-CTA shape working.
  const ctas: HeroBannerCta[] = (
    Array.isArray(ctaButtons) && ctaButtons.length > 0 ? ctaButtons : [{ label: ctaLabel, href: ctaHref, variant: "primary" as const }]
  ).filter((cta): cta is HeroBannerCta => Boolean(cta) && Boolean(cta.label) && Boolean(cta.href));

  return (
    <div className={rootClass} style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}>
      <div className={getChildClass("content")}>
        {headline && <h1 className={getChildClass("headline")}>{headline}</h1>}
        {subtext && <p className={getChildClass("subtext")}>{subtext}</p>}
        {ctas.length > 0 && (
          <div className={getChildClass("ctas")}>
            {ctas.map((cta, index) => (
              <a
                key={`${cta.href}-${index}`}
                className={`${getChildClass("cta")} ${cta.variant === "secondary" ? getChildClass("cta-secondary") : ""}`.trim()}
                href={cta.href}
              >
                {cta.label}
              </a>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
