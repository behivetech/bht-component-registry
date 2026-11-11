import classnames from "classnames";
import { describe, expect, it } from "vitest";
import { getClassName } from "./get-class-name.js";
import { joinClassNames, type ClassValue } from "./join-class-names.js";

/**
 * The reference: `getClassName` exactly as it was while it still used the
 * `classnames` package. `classnames` is a test-only devDependency, here and
 * only here, so this stays true however the implementation changes.
 */
const reference = ({
  className,
  modifiers = {},
  rootClass,
  styles = {},
}: {
  className?: unknown;
  modifiers?: Record<string, unknown>;
  rootClass: string;
  styles?: Record<string, string>;
}): [string, (child: string) => string] => {
  const getModifiers = () => {
    const updated: Record<string, unknown> = {};
    const keys = Object.keys(modifiers);
    if (keys.length) {
      keys.forEach((modKey) => {
        const classKey = `${rootClass}--${modKey}`;
        const newClassName: string = styles[classKey] || classKey;
        updated[newClassName] = modifiers[modKey] ?? false;
      });
    }
    return updated;
  };
  const getChildClass = (child: string) => {
    const classKey = `${rootClass}__${child}`;
    return styles[classKey] || classKey;
  };
  return [
    classnames(
      className as never,
      { ...getModifiers() } as never,
      styles[rootClass] || rootClass,
    ),
    getChildClass,
  ];
};

/** mulberry32: a small seeded generator, so a failure names the same input every run. */
const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const WORDS = [
  "a",
  "b",
  "primary",
  "is-active",
  "BHT__Button",
  "x y",
  " padded ",
  "",
  "0",
  "1",
  "2",
  "10",
  "constructor",
  "__proto__",
  "hasOwnProperty",
  "é",
  "😀",
  "a-b_c",
];
const ROOTS = [
  "Button",
  "BHT__Card",
  "ACME__PriceTag",
  "a",
  "x y",
  "",
  "1",
  "Root",
];

describe("getClassName against the classnames-based original", () => {
  const run = (seed: number, cases: number) => {
    const random = seeded(seed);
    const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]!;
    const word = () => pick(WORDS);

    const value = (depth: number): unknown => {
      const kind = Math.floor(random() * (depth > 2 ? 8 : 12));
      const make: Array<() => unknown> = [
        () => undefined,
        () => null,
        () => false,
        () => true,
        () => word(),
        () => word(),
        () => Math.floor(random() * 5) - 1,
        () => NaN,
        () => [value(depth + 1), value(depth + 1)],
        () => ({ [word()]: value(depth + 1), [word()]: random() < 0.5 }),
        () => {
          const fixed = word();
          return { toString: () => fixed };
        },
        () => [],
      ];
      return make[kind]!();
    };

    const modifiers = () => {
      const result: Record<string, unknown> = {};
      const count = Math.floor(random() * 5);
      for (let i = 0; i < count; i += 1) {
        const mod = word();
        result[mod] = pick([true, false, undefined, 1, 0, "yes", "", null]);
      }
      return result;
    };

    const styles = (root: string, mods: Record<string, unknown>) => {
      const result: Record<string, string> = {};
      if (random() < 0.5) return result;
      if (random() < 0.7)
        result[root] = pick(["m_root", "", "m root", "7", word()]);
      Object.keys(mods).forEach((mod) => {
        if (random() < 0.5)
          result[`${root}--${mod}`] = pick([
            "m_mod",
            "",
            word(),
            "3",
            "m_root",
          ]);
      });
      ["icon", "a", "b", ""].forEach((child) => {
        if (random() < 0.4)
          result[`${root}__${child}`] = pick(["m_child", "", word()]);
      });
      return result;
    };

    const differences: string[] = [];
    for (let i = 0; i < cases; i += 1) {
      const rootClass = pick(ROOTS);
      const mods = modifiers();
      const props = {
        className: random() < 0.2 ? undefined : value(0),
        modifiers: random() < 0.1 ? undefined : mods,
        rootClass,
        styles: random() < 0.1 ? undefined : styles(rootClass, mods),
      };
      const [expectedRoot, expectedChild] = reference(props);
      const [actualRoot, actualChild] = getClassName(props as never);
      const children = ["icon", "a", "b", "", "x y"];
      const same =
        actualRoot === expectedRoot &&
        children.every((child) => actualChild(child) === expectedChild(child));
      if (!same) {
        differences.push(
          `${JSON.stringify(props)} → ${actualRoot} (expected ${expectedRoot})`,
        );
      }
    }
    return differences;
  };

  it("gives the same classes for 100,000 generated inputs, with zero differences", () => {
    const differences = [...run(1, 50_000), ...run(2, 50_000)];
    expect(differences.slice(0, 5)).toEqual([]);
    expect(differences).toHaveLength(0);
  });

  it("joinClassNames matches classnames on 100,000 generated value lists", () => {
    const random = seeded(3);
    const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]!;
    const value = (depth: number): ClassValue => {
      const kind = Math.floor(random() * (depth > 3 ? 7 : 11));
      const make: Array<() => ClassValue> = [
        () => undefined,
        () => null,
        () => false,
        () => pick(WORDS),
        () => pick(WORDS),
        () => Math.floor(random() * 7) - 2,
        () => NaN,
        () => [value(depth + 1), value(depth + 1), value(depth + 1)],
        () => ({
          [pick(WORDS)]: pick([true, false, 0, 1, "x", null]),
          [pick(WORDS)]: true,
        }),
        () => {
          const fixed = pick(WORDS);
          return { toString: () => fixed } as unknown as ClassValue;
        },
        () => [],
      ];
      return make[kind]!();
    };
    const differences: string[] = [];
    for (let i = 0; i < 100_000; i += 1) {
      const args = Array.from({ length: Math.floor(random() * 5) }, () =>
        value(0),
      );
      const expected = classnames(...(args as never[]));
      const actual = joinClassNames(...args);
      if (actual !== expected)
        differences.push(
          `${JSON.stringify(args)} → ${actual} (expected ${expected})`,
        );
    }
    expect(differences.slice(0, 5)).toEqual([]);
    expect(differences).toHaveLength(0);
  });
});
