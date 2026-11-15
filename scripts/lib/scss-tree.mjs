// How the checks in scss-conventions.mjs read the parsed rule tree: selector
// lists, the layer a rule sits in, and what a rule declares on its own element.

/** A `--modifier` anywhere in a selector. */
export const MODIFIER = /--[A-Za-z0-9]/;

/** `@media`, `@include`, `@each` and the other blocks that are not selectors. */
export const isAtRule = (rule) => rule.selector.startsWith("@");

/** The selectors of a list, split on the commas outside `()` and `[]`. */
export const parts = (rule) => {
  const found = [""];
  let depth = 0;

  for (const char of rule.shape) {
    depth += { "(": 1, "[": 1, ")": -1, "]": -1 }[char] ?? 0;

    if (char === "," && depth === 0) {
      found.push("");
    } else {
      found[found.length - 1] += char;
    }
  }

  return found.map((part) => part.trim());
};

/** Whether every selector of the rule's list passes. */
export const every = (rule, test) => parts(rule).every(test);

/** Whether any selector of the rule's list passes. */
export const some = (rule, test) => parts(rule).some(test);

/** `:root[data-theme="dark"] &`: an outside condition, not part of the block. */
export const isContext = (rule) =>
  every(rule, (part) => / &$/.test(part) && !MODIFIER.test(part));

/** At-rules and outside conditions wrap rules without being a layer of the block. */
export const isSeeThrough = (rule) => isAtRule(rule) || isContext(rule);

/** The nearest ancestor that is a selector, not an at-rule such as `@media`. */
export const selectorParent = (rule) => {
  let parent = rule.parent;

  while (parent && isAtRule(parent)) {
    parent = parent.parent;
  }

  return parent;
};

/** The layer a rule really sits in: at-rules and outside conditions are skipped. */
export const layerAbove = (rule) => {
  let parent = rule.parent;

  while (parent && isSeeThrough(parent)) {
    parent = parent.parent;
  }

  return parent;
};

/** Every layer a rule sits in, nearest first. */
export const layersAbove = (rule) => {
  const found = [];

  for (let at = layerAbove(rule); at; at = layerAbove(at)) {
    found.push(at);
  }

  return found;
};

/** Keyframe steps (`to`, `50%`) are not selectors of the component. */
export const insideKeyframes = (rule) => {
  let at = rule.parent;

  while (at && !/^@(-\w+-)?keyframes\b/.test(at.selector)) {
    at = at.parent;
  }

  return Boolean(at);
};

/**
 * Every declaration a rule makes on its own element: its own, plus the ones
 * inside an at-rule or an outside condition placed directly in it.
 */
export const countOwnDeclarations = (rules) => {
  const totals = new Map(rules.map((rule) => [rule, rule.declarations]));

  for (const rule of rules.filter(isSeeThrough)) {
    const owner = layerAbove(rule);

    if (owner) {
      totals.set(owner, totals.get(owner) + rule.declarations);
    }
  }

  return totals;
};
