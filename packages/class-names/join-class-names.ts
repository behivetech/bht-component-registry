/**
 * Anything `joinClassNames` accepts: the value kinds the `classnames` package
 * took, which is what `getClassName` has always passed through.
 */
export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [className: string]: unknown };

const hasOwn = Object.prototype.hasOwnProperty;
const nativeToString = Object.prototype.toString;

/**
 * Adds one class to the string. `+` and not a template literal on purpose: a
 * value with its own `valueOf` joins the way it always has.
 */
const append = (classes: string, next: string | number): string => {
  let result = classes;
  if (next) {
    result = classes ? classes + ' ' + next : classes + next;
  }
  return result;
};

/** Whether an object brings its own `toString` (a class name builder, a URL-like value). */
const hasCustomToString = (value: object): boolean => {
  const { toString } = value as { toString?: unknown };
  return (
    typeof toString === 'function' &&
    toString !== nativeToString &&
    !Function.prototype.toString.call(toString).includes('[native code]')
  );
};

const parse = (value: unknown): string | number => {
  let parsed: string | number = '';
  if (typeof value === 'string' || typeof value === 'number') {
    parsed = value;
  } else if (Array.isArray(value)) {
    parsed = joinClassNames(...(value as ClassValue[]));
  } else if (typeof value === 'object' && value !== null) {
    if (hasCustomToString(value)) {
      parsed = (value as { toString(): string }).toString();
    } else {
      parsed = Object.keys(value).reduce(
        (classes, key) =>
          hasOwn.call(value, key) && (value as Record<string, unknown>)[key]
            ? append(classes, key)
            : classes,
        '',
      );
    }
  }
  return parsed;
};

/**
 * Joins class names into one space-separated string, skipping anything falsy.
 *
 * It does what the `classnames` package did for `getClassName`, byte for byte,
 * so the output of every component is unchanged by dropping that dependency:
 *
 * - a string or a number is added as it is (`0` and `''` are falsy and skipped);
 * - an array is joined recursively;
 * - an object adds each of its own keys whose value is truthy, in key order
 *   (integer-like keys first, as JavaScript orders them);
 * - an object with a `toString` of its own is added as that string;
 * - everything else (`null`, `undefined`, `false`, `true`, functions, symbols,
 *   bigints) is skipped.
 *
 * Unlike `classnames`, an object with no prototype, or one whose `toString`
 * key is not a function, is read as a plain object rather than throwing.
 *
 * @param values the names, arrays and objects to join
 * @returns the class string, or `''` when nothing was truthy
 */
export const joinClassNames = (...values: ClassValue[]): string =>
  values.reduce<string>(
    (classes, value) => (value ? append(classes, parse(value)) : classes),
    '',
  );
