// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./button.module.scss";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Controls the color/style treatment; defaults to primary */
  variant?: ButtonVariant;
  /** Controls the size; defaults to md */
  size?: ButtonSize;
  /** Shows a spinner and disables the button while an action is in flight */
  loading?: boolean;
  /** Renders the button as a square icon-only control with no visible label spacing */
  iconOnly?: boolean;
  /** Additional class names to merge with the component root element */
  className?: string;
  /** Button label/content */
  children?: React.ReactNode;
  /** Renders the button's props onto its single child element (via Radix `Slot`) instead of a `<button>` */
  asChild?: boolean;
}

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  iconOnly = false,
  disabled,
  className,
  children,
  asChild = false,
  ...rest
}: ButtonProps) => {
  const [rootClass, getChildClass] = getClassName({
    className,
    rootClass: "BHT__Button",
    modifiers: {
      [variant]: true,
      [size]: true,
      loading,
      disabled: !!disabled,
      "icon-only": iconOnly,
    },
    styles,
  });

  const Comp = (asChild ? Slot : "button") as React.ElementType;

  return (
    <Comp {...rest} className={rootClass} disabled={disabled || loading} aria-busy={loading || undefined}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <span className={getChildClass("spinner")} aria-hidden="true" />}
          <span className={getChildClass("label")}>{children}</span>
        </>
      )}
    </Comp>
  );
};
