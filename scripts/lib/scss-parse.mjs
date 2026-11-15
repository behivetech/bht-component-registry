// A small SCSS block parser: the rule blocks with their selectors, nesting and
// line numbers, and the files pulled in with @use. It reads no values, which is
// all scss-conventions.mjs needs, so the repo takes no SCSS parser dependency.

const USE = /^@(?:use|import|forward)\s+["']([^"']+)["']/;

const endOr = (found, fallback) => (found === -1 ? fallback : found);

/**
 * The text the parser steps over whole: comments are dropped, strings and
 * `#{…}` interpolations are kept as they are, so a brace inside one is never
 * read as a block.
 *
 * @returns {{ end: number, kept: string } | null} `end` is the last index used.
 */
const inertSpan = (source, index, buffer) => {
  const char = source[index];
  const pair = source.slice(index, index + 2);
  const last = source.length - 1;
  const keep = (end) => ({ end, kept: source.slice(index, end + 1) });
  const spans = [
    [
      // `//` inside an unquoted url(…) is part of the address, not a comment.
      pair === "//" && !/url\([^)]*$/.test(buffer),
      () => ({
        end: endOr(source.indexOf("\n", index), last + 1) - 1,
        kept: "",
      }),
    ],
    [
      pair === "/*",
      () => ({
        end: endOr(source.indexOf("*/", index + 2), last) + 1,
        kept: "",
      }),
    ],
    [
      char === '"' || char === "'",
      () => keep(endOr(source.indexOf(char, index + 1), last)),
    ],
    [pair === "#{", () => keep(endOr(source.indexOf("}", index), last))],
  ];

  return spans.find(([matches]) => matches)?.[1]() ?? null;
};

const countLines = (text) => text.split("\n").length - 1;

/** A `;` ends a declaration, an `@include`, or an `@use` of another file. */
const readStatement = (statement, state) => {
  const use = statement.match(USE);
  const declares =
    !statement.startsWith("@") || statement.startsWith("@include");

  if (use) {
    state.uses.push({ target: use[1], line: state.startLine });
  } else if (statement && declares && state.stack.length) {
    state.stack.at(-1).declarations += 1;
  }
};

const openRule = (state) => {
  const selector = state.buffer.trim().replace(/\s+/g, " ");
  const rule = {
    selector,
    // The selector with each interpolation read as a plain name part, so
    // `&--size-#{$n}` has the shape of `&--size-x`. `#{&}` is left to be seen.
    shape: selector.replace(/#\{(?!&\})[^}]*\}/g, "x"),
    line: state.startLine,
    parent: state.stack.at(-1) ?? null,
    declarations: 0,
  };

  state.rules.push(rule);
  state.stack.push(rule);
};

const STRUCTURE = {
  "{": openRule,
  // A last declaration may end at the brace, with no semicolon.
  "}": (state) => {
    readStatement(state.buffer.trim(), state);
    state.stack.pop();
  },
  ";": (state) => readStatement(state.buffer.trim(), state),
};

/**
 * Parses SCSS into its rule blocks.
 *
 * @param {string} source
 * @returns {{ rules: Array<object>, uses: Array<{ target: string, line: number }> }}
 */
export const parseScss = (source) => {
  const state = { rules: [], uses: [], stack: [], buffer: "", startLine: 1 };
  let line = 1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const inert = inertSpan(source, index, state.buffer);

    if (inert) {
      state.buffer += inert.kept;
      line += countLines(source.slice(index, inert.end + 1));
      index = inert.end;
    } else if (STRUCTURE[char]) {
      STRUCTURE[char](state);
      state.buffer = "";
    } else {
      if (!state.buffer.trim() && !/\s/.test(char)) {
        state.startLine = line;
      }

      line += char === "\n" ? 1 : 0;
      state.buffer += char;
    }
  }

  return { rules: state.rules, uses: state.uses };
};
