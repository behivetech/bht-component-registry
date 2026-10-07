// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { type HTMLAttributes } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./badge.module.scss";

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Controls the color scheme; defaults to default */
  variant?: BadgeVariant;
  /** Controls the size; defaults to md */
  size?: BadgeSize;
  /** Additional class names to merge with the component root element */
  className?: string;
  /** Content to render inside the badge */
  children?: React.ReactNode;
}

export const Badge = ({ variant = "default", size = "md", className, children, ...rest }: BadgeProps) => {
  const [rootClass] = getClassName({
    className,
    rootClass: "BHT__Badge",
    modifiers: { [variant]: true, [size]: true },
    styles,
  });

  return (
    <span {...rest} className={rootClass}>
      {children}
    </span>
  );
};
