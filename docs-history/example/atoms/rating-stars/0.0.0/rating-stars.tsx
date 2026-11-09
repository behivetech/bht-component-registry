import { type HTMLAttributes } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./rating-stars.module.scss";

export type RatingStarsSize = "sm" | "md" | "lg";

export interface RatingStarsProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The rating to show, from 0 to `max`; fractions render as partially filled stars */
  value: number;
  /** Number of stars; defaults to 5 */
  max?: number;
  /** Optional review count shown after the stars, e.g. "(128)" */
  count?: number;
  /** Controls the star size; defaults to md */
  size?: RatingStarsSize;
  /** Additional class names to merge with the component root element */
  className?: string;
}

/**
 * A read-only star rating.
 *
 * Fractional values are drawn with a clipped fill rather than rounded to a
 * half, so 4.3 and 4.7 look different. The stars are decorative; the value is
 * announced once through the root's `aria-label`.
 */
export const RatingStars = ({ value, max = 5, count, size = "md", className, ...rest }: RatingStarsProps) => {
  const [rootClass, getChildClass] = getClassName({
    className,
    rootClass: "ACME__RatingStars",
    modifiers: { [size]: true },
    styles,
  });

  const clamped = Math.min(Math.max(value, 0), max);
  const label = `${clamped.toFixed(1).replace(/\.0$/, "")} out of ${max} stars${count !== undefined ? `, ${count} reviews` : ""}`;

  return (
    <span {...rest} className={rootClass} role="img" aria-label={label}>
      <span className={getChildClass("stars")} aria-hidden>
        {Array.from({ length: max }, (_, index) => {
          const fill = Math.min(Math.max(clamped - index, 0), 1);
          return (
            <span
              key={index}
              className={getChildClass("star")}
              // The one value CSS cannot know: how much of THIS star is filled.
              style={{ "--acme-star-fill": `${fill * 100}%` } as React.CSSProperties}
            >
              ★
            </span>
          );
        })}
      </span>
      {count !== undefined && <span className={getChildClass("count")}>({count.toLocaleString()})</span>}
    </span>
  );
};
