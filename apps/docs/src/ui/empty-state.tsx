// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { type HTMLAttributes, type ReactNode } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./empty-state.module.scss";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional class names to merge with the component root element */
  className?: string;
  /** Icon or illustration shown above the description */
  icon?: ReactNode;
  /** Message explaining the empty state */
  description: ReactNode;
  /** Action content rendered below the description (typically a Button) */
  children?: ReactNode;
}

/**
 * Generic centered placeholder for empty lists/grids/results: icon, a
 * description, and an optional action.
 */
export const EmptyState = ({ className, icon, description, children, ...rest }: EmptyStateProps) => {
  const [rootClass, getChildClass] = getClassName({
    className,
    rootClass: "BHT__EmptyState",
    styles,
  });

  return (
    <div {...rest} className={rootClass}>
      {icon !== undefined && <div className={getChildClass("icon")}>{icon}</div>}
      <p className={getChildClass("description")}>{description}</p>
      {children !== undefined && <div className={getChildClass("action")}>{children}</div>}
    </div>
  );
};
