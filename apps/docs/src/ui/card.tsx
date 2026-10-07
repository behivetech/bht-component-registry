// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { useId, type HTMLAttributes, type MouseEventHandler, type ReactNode } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./card.module.scss";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "onSelect"> {
  /** Controls internal padding; defaults to none so consumers opt in. Applies to the body when a header is present. */
  padding?: CardPadding;
  /** Optional icon rendered before the title in the header */
  icon?: ReactNode;
  /** Optional header title; omit along with `icon`/`action` to render no header */
  title?: ReactNode;
  /**
   * Which heading tag (`h1`–`h6`) wraps `title`, so the card's title takes its
   * correct place in the page's heading outline. Defaults to `3`, matching a
   * card nested one level below a page's `h1` title and a `section`'s `h2` —
   * override per-instance when a card sits at a different depth.
   */
  headingLevel?: CardHeadingLevel;
  /** Optional content rendered at the end of the header (buttons, menus, a close control, etc.) */
  action?: ReactNode;
  /**
   * Makes the body a real `<button>` — hover/focus affordance plus a centered,
   * stacked content layout — for tile/action-card patterns (a picker grid,
   * for example) instead of a static surface. Distinct from `onClick` (a plain
   * pass-through to the root element, e.g. for stopping click propagation).
   * Omit for a plain, non-interactive card.
   */
  onSelect?: MouseEventHandler<HTMLButtonElement>;
  /**
   * Keeps the header fixed and scrolls only the body when content exceeds the
   * card's height. Only meaningful when the card has a bounded height (a
   * modal or drawer panel, for example).
   */
  scrollableBody?: boolean;
  /** Additional class names to merge with the component root element */
  className?: string;
  /** Card body content */
  children?: ReactNode;
}

export const Card = ({
  padding = "none",
  icon,
  title,
  headingLevel = 3,
  action,
  onSelect,
  scrollableBody = false,
  className,
  children,
  ...rest
}: CardProps) => {
  const generatedTitleId = useId();
  const hasHeader = icon !== undefined || title !== undefined || action !== undefined;
  const hasTitle = title !== undefined;
  const interactive = onSelect !== undefined;
  const HeadingTag = `h${headingLevel}` as React.ElementType;
  // A section with no accessible name is not a meaningful landmark, so only
  // use <section> when there's an actual heading (title) to name it with.
  const RootTag = (hasTitle ? "section" : "div") as React.ElementType;
  const titleId = hasTitle ? `${generatedTitleId}-title` : undefined;

  const [rootClass, getChildClass] = getClassName({
    className,
    rootClass: "BHT__Card",
    modifiers: {
      [`padding-${padding}`]: true,
      interactive,
      "scrollable-body": scrollableBody,
    },
    styles,
  });

  const BodyTag = (interactive ? "button" : "div") as React.ElementType;

  return (
    <RootTag {...rest} className={rootClass} aria-labelledby={titleId}>
      {hasHeader && (
        <div className={getChildClass("header")}>
          <span className={getChildClass("heading")}>
            {icon !== undefined && <span className={getChildClass("icon")}>{icon}</span>}
            {hasTitle && (
              <HeadingTag id={titleId} className={getChildClass("title")}>
                {title}
              </HeadingTag>
            )}
          </span>
          {action !== undefined && <span className={getChildClass("action")}>{action}</span>}
        </div>
      )}
      <BodyTag type={interactive ? "button" : undefined} onClick={onSelect} className={getChildClass("body-padding")}>
        {children}
      </BodyTag>
    </RootTag>
  );
};
