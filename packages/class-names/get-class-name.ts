import { joinClassNames, type ClassValue } from './join-class-names.js';

/** Options for {@link getClassName}. */
export interface IGetClassNameProps {
  /** className prop generally passed in from the parent component. */
  className?: ClassValue;
  /**
   * Modifiers of the root element. Each key whose value is truthy adds
   * `<rootClass>--<key>` (looked up in `styles` first).
   */
  modifiers?: { [key: string]: boolean | undefined };
  /** Block class of the component, e.g. `ACME__PriceTag`. */
  rootClass: string;
  /** A CSS module's class map; a name found in it is replaced by the module's name for it. */
  styles?: { [key: string]: string };
}

/** Builds the class of a child element: `<rootClass>__<child>`, through `styles`. */
export type GetChildClass = (childClassName: string) => string;

/**
 * BEM class names for one component: the root's class string and a function
 * for its children's.
 *
 * Every class in the registry is built here so the scheme lives in one place:
 * the root is `rootClass`, children are `rootClass__child`, and modifiers are
 * `rootClass--modifier`. When a CSS module's `styles` map is passed, every name
 * is looked up in it first, which is how the generated scoped names reach the DOM.
 *
 * @param props the root class, optional `className`, `modifiers` and `styles`
 * @returns `[rootClassString, getChildClass]`
 *
 * @example
 * const [rootClass, getChildClass] = getClassName({
 *   rootClass: 'Button',
 *   className: 'extra',
 *   modifiers: { primary: true, disabled: false },
 * });
 * rootClass; // 'extra Button--primary Button'
 * getChildClass('icon'); // 'Button__icon'
 */
export const getClassName = ({
  className,
  modifiers = {},
  rootClass,
  styles = {},
}: IGetClassNameProps): [string, GetChildClass] => {
  const getChildClass: GetChildClass = (childClassName) => {
    const classKey = `${rootClass}__${childClassName}`;
    return styles[classKey] || classKey;
  };

  // A plain object on purpose: the order a plain object lists its keys in
  // (integer-like names first) is part of what the root class string has always
  // been, and a module name that collides with another modifier's overwrites it.
  const active: Record<string, boolean | undefined> = {};
  Object.keys(modifiers).forEach((modifier) => {
    const classKey = `${rootClass}--${modifier}`;
    active[styles[classKey] || classKey] = modifiers[modifier] ?? false;
  });

  return [
    joinClassNames(className, active, styles[rootClass] || rootClass),
    getChildClass,
  ];
};
