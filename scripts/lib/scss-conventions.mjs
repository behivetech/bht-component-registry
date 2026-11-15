// The SCSS shape every `.module.scss` in this repo follows, as checks.
//
//   .Root {
//     &__child { … }
//
//     &--modifier {
//       &.Root { … }        // the root's own properties under the modifier
//
//       .Root {
//         &__child { … }    // a child under the modifier
//       }
//     }
//   }
//
// One file styles one component: every class it names belongs to its own root
// block, and it never pulls another component's stylesheet in.
//
// The guide, and what stays a review matter: the Components guide in
// apps/docs/default-docs/guide ("Modifiers in the stylesheet").

import { parseScss } from "./scss-parse.mjs";
import {
  MODIFIER,
  countOwnDeclarations,
  every,
  insideKeyframes,
  isAtRule,
  isContext,
  layerAbove,
  layersAbove,
  selectorParent,
  some,
} from "./scss-tree.mjs";

const PLAIN_MODIFIER = /^&--[\w-]+$/;
const CLASS_TOKEN = /\.(-?[A-Za-z_][\w-]*)/g;
// Attribute selectors and strings can hold a dot that is not a class.
const NOT_CLASSES = /\[[^\]]*\]|"[^"]*"|'[^']*'/g;
// A modifier followed by a combinator and something more: `&--md &__title`.
// Also inside a negation: `&:not(.Root--md) &__title`.
const MODIFIER_THEN_DESCENDANT =
  /--[\w-]+(?:[.:[)][^\s>+~]*)?\s*[\s>+~]\s*[^\s{]/;
// Classes a third-party library sets at runtime, which the component has no
// prop for: the class version of the Radix `data-state` exception. Keep it short.
const THIRD_PARTY_CLASSES = [/^ProseMirror(-|$)/];

/**
 * What the checks need to know about one stylesheet: its root block and how to
 * recognise the root, a modifier and a class of its own.
 */
const describeSheet = (rules) => {
  const styleRules = rules.filter(
    (rule) => !isAtRule(rule) && !insideKeyframes(rule),
  );
  const blocks = styleRules.filter(
    (rule) => !selectorParent(rule) && /^\.[\w-]+$/.test(rule.selector),
  );
  const root = blocks[0]?.selector ?? null;
  const name = root?.slice(1);
  const totals = countOwnDeclarations(rules);
  const isRoot = (rule) => blocks.includes(rule) && rule.selector === root;
  const isCompoundModifier = (part) =>
    part.startsWith(`&${root}--`) && /^&\.[\w-]+$/.test(part);

  return {
    root,
    styleRules,
    blocks,
    isRoot,
    isCompoundModifier,
    declares: (rule) => totals.get(rule) > 0,
    /** `&--md`, with or without something after it, directly in the root block. */
    isFirstLevelModifier: (rule) =>
      Boolean(layerAbove(rule)) &&
      isRoot(layerAbove(rule)) &&
      some(rule, (part) => part.startsWith("&--")),
    /** `.Root` opened again inside the block, to reach its children. */
    isReopenedRoot: (rule) => rule.selector === root && !isRoot(rule),
    isModifierBlock: (rule) =>
      every(
        rule,
        (part) => PLAIN_MODIFIER.test(part) || isCompoundModifier(part),
      ),
    owns: (className) =>
      THIRD_PARTY_CLASSES.some((pattern) => pattern.test(className)) ||
      className === name ||
      className.startsWith(`${name}__`) ||
      className.startsWith(`${name}--`),
  };
};

// Each nesting check answers with a message, or null when the rule is fine.
// They run in this order and the first message wins, so one mistake is one line.

const parentSelectorInterpolated = (rule) =>
  rule.selector.includes("#{&}--")
    ? `"${rule.selector}" builds a modifier from #{&}; write the modifier as &--modifier and nest inside it`
    : null;

const descendantOnModifierLine = (rule, { root }) =>
  some(rule, (part) => MODIFIER_THEN_DESCENDANT.test(part))
    ? `"${rule.selector}" reaches a descendant on the modifier's own line; nest it as &--modifier { ${root} { &__child { … } } }`
    : null;

const modifierOutsideRoot = (rule, { root }) =>
  !layerAbove(rule) && MODIFIER.test(rule.shape.replace(root, ""))
    ? `"${rule.selector}" is outside the ${root} block; write the modifier as &--modifier inside it`
    : null;

const isPlainModifierBlock = (rule) =>
  every(rule, (part) => PLAIN_MODIFIER.test(part));

const modifierWithSuffix = (rule, sheet) =>
  sheet.isFirstLevelModifier(rule) && !isPlainModifierBlock(rule)
    ? `"${rule.selector}" adds to the modifier on its own line; open &--modifier alone and put states in &${sheet.root} { &:hover { … } }`
    : null;

const compoundAtFirstLevel = (rule, sheet) => {
  const above = layerAbove(rule);
  const atFirstLevel = Boolean(above) && sheet.isRoot(above);

  return atFirstLevel && some(rule, sheet.isCompoundModifier)
    ? `"${rule.selector}" is a modifier written as a compound; write it as &--modifier { &${sheet.root} { … } }`
    : null;
};

const strayInModifier = (rule, sheet) => {
  const above = layerAbove(rule);
  const inModifier = Boolean(above) && sheet.isFirstLevelModifier(above);
  const allowed =
    rule.selector === `&${sheet.root}` ||
    rule.selector === sheet.root ||
    every(rule, sheet.isCompoundModifier) ||
    isContext(rule);

  return inModifier && !allowed
    ? `"${rule.selector}" sits directly in "${above.selector}"; only &${sheet.root} { … } (the root) and ${sheet.root} { &__child { … } } (children) go there`
    : null;
};

const childOutsideReopenedRoot = (rule, sheet) => {
  const { root } = sheet;
  const targetsChild = some(
    rule,
    (part) => /^&__[\w-]+/.test(part) || part.startsWith(`${root}__`),
  );
  const underModifier = layersAbove(rule).some(
    (layer) =>
      !sheet.isRoot(layer) &&
      some(
        layer,
        (part) => part.startsWith("&--") || part.startsWith(`&${root}--`),
      ),
  );
  const above = layerAbove(rule);
  const reopened = Boolean(above) && sheet.isReopenedRoot(above);
  const holder = reopened ? layerAbove(above) : null;
  const placed = Boolean(holder) && sheet.isModifierBlock(holder);

  return targetsChild && underModifier && !placed
    ? `"${rule.selector}" is a child under a modifier; it belongs in ${root} { … } placed directly inside the modifier block`
    : null;
};

/** `.Root { &:hover }` inside the block styles a nested copy of the component, not this one. */
const strayInReopenedRoot = (rule, sheet) => {
  const above = layerAbove(rule);
  const inReopened = Boolean(above) && sheet.isReopenedRoot(above);

  return inReopened && !every(rule, (part) => /^&__[\w-]+/.test(part))
    ? `"${rule.selector}" sits in the re-opened ${sheet.root}, which holds &__child blocks only; the root's own states and modifiers go in &${sheet.root} { … }`
    : null;
};

const reopenedRootDeclares = (rule, sheet) =>
  sheet.isReopenedRoot(rule) && sheet.declares(rule)
    ? `"${rule.selector}" is re-opened to reach children, so it holds &__child blocks only; the root's own properties go in &${sheet.root} { … }`
    : null;

const NESTING_CHECKS = [
  parentSelectorInterpolated,
  descendantOnModifierLine,
  modifierOutsideRoot,
  modifierWithSuffix,
  compoundAtFirstLevel,
  strayInModifier,
  strayInReopenedRoot,
  childOutsideReopenedRoot,
  reopenedRootDeclares,
];

const foreignClasses = (rule, sheet) =>
  [...rule.shape.replace(NOT_CLASSES, "").matchAll(CLASS_TOKEN)]
    .filter(([, className]) => !sheet.owns(className))
    .map(
      ([, className]) =>
        `.${className} is not part of ${sheet.root}; style another component through its props or a className passed to it`,
    );

/** The checks on a first-level modifier block itself. */
const modifierBlockProblems = (rule, sheet, opened) => {
  const found = [];
  const key = rule.selector;

  if (opened.has(key)) {
    found.push({
      rule: "modifier-nesting",
      message: `"${rule.selector}" is already open on line ${opened.get(key)}; keep one block per modifier`,
    });
  }

  opened.set(key, opened.get(key) ?? rule.line);

  if (sheet.declares(rule)) {
    found.push({
      rule: "modifier-root",
      message: `"${rule.selector}" sets properties directly; the root's own properties under a modifier go in &${sheet.root} { … }`,
    });
  }

  return found;
};

const ruleProblems = (rule, sheet, opened) => {
  const found = foreignClasses(rule, sheet).map((message) => ({
    rule: "own-file",
    message,
  }));
  const nesting = NESTING_CHECKS.map((check) => check(rule, sheet)).find(
    Boolean,
  );

  if (sheet.isFirstLevelModifier(rule) && isPlainModifierBlock(rule)) {
    found.push(...modifierBlockProblems(rule, sheet, opened));
  }

  if (nesting) {
    found.push({ rule: "modifier-nesting", message: nesting });
  }

  return found.map((problem) => ({ line: rule.line, ...problem }));
};

/** A file whose first block is not one class cannot be checked, so it says so. */
const missingRoot = (sheet) =>
  !sheet.root && sheet.styleRules.length > 0
    ? [
        {
          line: sheet.styleRules[0].line,
          rule: "own-file",
          message: `"${sheet.styleRules[0].selector}" is not a root block; a component stylesheet starts with its one class, .ComponentName { … }`,
        },
      ]
    : [];

const fileProblems = (uses, sheet, allowedUses) => [
  ...missingRoot(sheet),
  ...uses
    .filter(
      (use) =>
        /\.module(\.scss)?$/.test(use.target) &&
        !allowedUses.includes(use.target),
    )
    .map((use) => ({
      line: use.line,
      rule: "own-file",
      message: `"${use.target}" is another component's stylesheet; a file styles its own component only`,
    })),
  ...sheet.blocks
    .filter((block) => block.selector !== sheet.root)
    .map((block) => ({
      line: block.line,
      rule: "own-file",
      message: `${block.selector} is a second block; each component gets its own .module.scss`,
    })),
];

/**
 * Checks one stylesheet.
 *
 * @param {string} source
 * @param {{ allowedUses?: string[] }} [options] Stylesheets of other components
 *   this file may pull in: the packaging exception, named per file by the caller.
 * @returns {Array<{ line: number, rule: string, message: string }>}
 */
export const checkScss = (source, { allowedUses = [] } = {}) => {
  const { rules, uses } = parseScss(source);
  const sheet = describeSheet(rules);
  const opened = new Map();
  const checked = sheet.root
    ? sheet.styleRules.filter(
        (rule) => !sheet.blocks.includes(rule) || sheet.isRoot(rule),
      )
    : [];

  return [
    ...fileProblems(uses, sheet, allowedUses),
    ...checked.flatMap((rule) => ruleProblems(rule, sheet, opened)),
  ].sort((a, b) => a.line - b.line);
};
