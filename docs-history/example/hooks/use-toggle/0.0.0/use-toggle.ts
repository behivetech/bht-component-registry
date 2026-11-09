import { useCallback, useState } from 'react';

/**
 * TODO: Describe the hook in one or two sentences. This JSDoc, the `@param`,
 * `@returns` and `@example` tags, and the TypeScript signature are what the
 * docs site shows for it — nothing is written by hand elsewhere.
 *
 * @param initial The starting value.
 * @returns The current value and a function that flips it.
 * @example
 * ```tsx
 * const [on, toggle] = useToggle(false);
 * <button type="button" onClick={toggle}>{on ? 'On' : 'Off'}</button>
 * ```
 */
export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((current) => !current), []);
  return [value, toggle];
}
