// Internal copy for the docs site's own chrome; not a registry component, not published. Edit freely.
import { type InputHTMLAttributes, useId } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./text-field.module.scss";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Additional class names to merge with the component root element */
  className?: string;
}

/**
 * Bare text input — the native `<input>` is this component's own root
 * element, no built-in label/hint/error. Pair it with a visible `<label>` or
 * an `aria-label`.
 */
export const TextField = ({ className, id, ...rest }: TextFieldProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const [rootClass] = getClassName({
    className,
    rootClass: "BHT__TextField",
    styles,
  });

  return <input {...rest} id={fieldId} className={rootClass} />;
};
