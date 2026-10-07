import { type HTMLAttributes } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./price-tag.module.scss";

export type PriceTagSize = "sm" | "md" | "lg";

export interface PriceTagProps extends HTMLAttributes<HTMLSpanElement> {
  /** The price to show, in major units (e.g. 19.99) */
  amount: number;
  /** ISO 4217 currency code; defaults to USD */
  currency?: string;
  /** BCP 47 locale used for formatting; defaults to the browser's, then en-US */
  locale?: string;
  /** The previous price, when `amount` is a discount — rendered struck through with the saving */
  compareAt?: number;
  /** Controls the type size; defaults to md */
  size?: PriceTagSize;
  /** Additional class names to merge with the component root element */
  className?: string;
}

/**
 * A formatted price, with an optional "was" price and the percentage saved.
 *
 * Formatting goes through `Intl.NumberFormat`, so currency symbols, decimal
 * rules and grouping follow the locale rather than being hand-rolled — 1 999 €
 * in French, $1,999.00 in US English, ¥1,999 with no decimals in Japanese.
 */
export const PriceTag = ({
  amount,
  currency = "USD",
  locale,
  compareAt,
  size = "md",
  className,
  ...rest
}: PriceTagProps) => {
  const [rootClass, getChildClass] = getClassName({
    className,
    rootClass: "ACME__PriceTag",
    modifiers: { [size]: true, discounted: compareAt !== undefined && compareAt > amount },
    styles,
  });

  const format = new Intl.NumberFormat(locale, { style: "currency", currency });
  const discounted = compareAt !== undefined && compareAt > amount;
  const saving = discounted ? Math.round(((compareAt - amount) / compareAt) * 100) : 0;

  return (
    <span {...rest} className={rootClass}>
      <span className={getChildClass("amount")}>{format.format(amount)}</span>
      {discounted && (
        <>
          <s className={getChildClass("compare-at")}>{format.format(compareAt)}</s>
          <span className={getChildClass("saving")}>−{saving}%</span>
        </>
      )}
    </span>
  );
};
