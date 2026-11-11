/**
 * Which registry packages a live-example program needs.
 *
 * A page never loads the whole component library, only what it renders. The
 * sandbox runs this on every program (the one a page sends, the one in the
 * URL, and each edit a reader types), so it cannot depend on build-time
 * knowledge of the example: it reads the program's own source.
 */

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;
const ATTRIBUTE_NAME_PART = /[\w$:-]/;
const WHITESPACE = /\s/;
const NUMBER_PART = /[\w.]/;
/** Words after which an expression (so a `<` that opens JSX, or a `/` that opens a regex) can start. */
const EXPRESSION_STARTERS = new Set([
  "return",
  "typeof",
  "case",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "else",
  "do",
  "yield",
  "await",
  "instanceof",
  "default",
]);
const DECLARATION_KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "class",
]);

/** What a program mentions and what it declares for itself. */
export interface ProgramNames {
  /** Plain identifiers and JSX element names, anywhere but comments, strings, JSX text and attribute names. */
  references: Set<string>;
  /** Names declared at the program's top level (`const X`, `function X`, `class X`, destructured). */
  declarations: Set<string>;
}

/** Where the scanner is in a run of code: bracket depth, and what the last token allows next. */
interface CodeState {
  depth: number;
  /** The last token ended a value, so a `<` or `/` is an operator, not JSX or a regex. */
  valueBefore: boolean;
  /** The last token was a `.`, so the next identifier is a property, not a reference. */
  afterDot: boolean;
}

/**
 * Reads a program once, left to right, and returns the names it uses.
 *
 * One pass tracks whether it is in code, a string, a template, a comment, a
 * JSX tag or JSX text, so a `//` inside `href="https://…"` is not a comment and
 * the apostrophe in `<p>Don't</p>` is not a quote. It does not parse the
 * language: where it is unsure it keeps a name rather than losing one.
 *
 * @param source the program as the reader sees it in the editor
 */
export const analyzeProgram = (source: string): ProgramNames => {
  const references = new Set<string>();
  const declarations = new Set<string>();
  const end = source.length;
  let at = 0;

  const char = (offset = 0) => source[at + offset] ?? "";
  const skipSpace = () => {
    while (at < end && WHITESPACE.test(char())) at += 1;
  };
  const skipComment = (): boolean => {
    const block = char() === "/" && char(1) === "*";
    const line = char() === "/" && char(1) === "/";
    if (block) {
      const close = source.indexOf("*/", at + 2);
      at = close < 0 ? end : close + 2;
    } else if (line) {
      const close = source.indexOf("\n", at);
      at = close < 0 ? end : close;
    }
    return block || line;
  };
  const skipTrivia = () => {
    skipSpace();
    while (skipComment()) skipSpace();
  };
  const readWhile = (pattern: RegExp): string => {
    const from = at;
    while (at < end && pattern.test(char())) at += 1;
    return source.slice(from, at);
  };
  // A JS string ends at its quote or, if unterminated, at the line's end.
  const skipString = (quote: string) => {
    at += 1;
    while (at < end && char() !== quote && char() !== "\n") {
      at += char() === "\\" ? 2 : 1;
    }
    if (char() === quote) at += 1;
  };
  // A JSX attribute string has no escapes and may span lines.
  const skipJsxString = (quote: string) => {
    const close = source.indexOf(quote, at + 1);
    at = close < 0 ? end : close + 1;
  };
  const skipRegex = (): boolean => {
    let cursor = at + 1;
    let inClass = false;
    let closed = false;
    while (cursor < end && source[cursor] !== "\n" && !closed) {
      const c = source[cursor];
      if (c === "\\") cursor += 1;
      else if (c === "[") inClass = true;
      else if (c === "]") inClass = false;
      else closed = c === "/" && !inClass;
      cursor += 1;
    }
    if (closed) {
      at = cursor;
      readWhile(/[a-z]/);
    }
    return closed;
  };

  /** Code up to `stop` at bracket depth 0 (not consumed), or the end. `root` is the program's own top level. */
  const scanCode = (stop: string, root: boolean): void => {
    const state: CodeState = { depth: 0, valueBefore: false, afterDot: false };
    skipTrivia();
    while (at < end && !(state.depth === 0 && stop.includes(char()))) {
      scanToken(state, root);
      skipTrivia();
    }
  };

  const scanTemplate = () => {
    at += 1;
    while (at < end && char() !== "`") {
      if (char() === "$" && char(1) === "{") {
        at += 2;
        scanCode("}", false);
        if (char() === "}") at += 1;
      } else {
        at += char() === "\\" ? 2 : 1;
      }
    }
    at += 1;
  };

  const scanPattern = (): void => {
    const open = char();
    const close = open === "{" ? "}" : "]";
    at += 1;
    skipTrivia();
    while (at < end && char() !== close) {
      const c = char();
      if (c === "{" || c === "[") scanPattern();
      else if (IDENTIFIER_START.test(c)) scanBinding(open);
      else at += c === "." && char(1) === "." && char(2) === "." ? 3 : 1;
      skipTrivia();
    }
    at += 1;
  };

  // `{ key: Alias = fallback }`: `key` is not declared, `Alias` is, and the fallback is an expression.
  const scanBinding = (open: string) => {
    const name = readWhile(IDENTIFIER_PART);
    skipTrivia();
    if (open === "{" && char() === ":") {
      at += 1;
    } else {
      declarations.add(name);
      if (char() === "=") {
        at += 1;
        scanCode(",}]", false);
      }
    }
  };

  const scanDeclaration = (keyword: string) => {
    skipTrivia();
    const isBinding =
      keyword === "const" || keyword === "let" || keyword === "var";
    if (char() === "*") at += 1;
    skipTrivia();
    if (isBinding && (char() === "{" || char() === "[")) scanPattern();
    else if (IDENTIFIER_START.test(char()))
      declarations.add(readWhile(IDENTIFIER_PART));
  };

  const scanIdentifier = (state: CodeState, root: boolean) => {
    const name = readWhile(IDENTIFIER_PART);
    if (state.afterDot) {
      // A property (`item.Icon`), not a reference.
    } else if (root && state.depth === 0 && DECLARATION_KEYWORDS.has(name)) {
      scanDeclaration(name);
    } else {
      references.add(name);
    }
    state.valueBefore = !EXPRESSION_STARTERS.has(name);
    state.afterDot = false;
  };

  const scanPunctuation = (state: CodeState) => {
    const c = char();
    const spread = c === "." && char(1) === "." && char(2) === ".";
    at += spread ? 3 : 1;
    if ("([{".includes(c)) state.depth += 1;
    if (")]}".includes(c)) state.depth = Math.max(0, state.depth - 1);
    state.afterDot = c === "." && !spread;
    state.valueBefore = c === ")" || c === "]";
  };

  const startsJsx = () => IDENTIFIER_START.test(char(1)) || char(1) === ">";

  const scanToken = (state: CodeState, root: boolean) => {
    const c = char();
    const isValue = (value: boolean) => {
      state.valueBefore = value;
      state.afterDot = false;
    };
    if (c === '"' || c === "'") {
      skipString(c);
      isValue(true);
    } else if (c === "`") {
      scanTemplate();
      isValue(true);
    } else if (c === "<" && !state.valueBefore && startsJsx()) {
      scanJsxElement();
      isValue(true);
    } else if (c === "/" && !state.valueBefore && skipRegex()) {
      isValue(true);
    } else if (IDENTIFIER_START.test(c)) {
      scanIdentifier(state, root);
    } else if (/[0-9]/.test(c)) {
      readWhile(NUMBER_PART);
      isValue(true);
    } else {
      scanPunctuation(state);
    }
  };

  // At a `<` that opens an element or fragment.
  const scanJsxElement = (): void => {
    at += 1;
    skipTrivia();
    if (char() !== ">") {
      // `Card.Header` references `Card`; `a:b` and `a-b` are not identifiers.
      references.add(readWhile(IDENTIFIER_PART));
      readWhile(/[\w$.:-]/);
    }
    const selfClosing = scanJsxAttributes();
    if (!selfClosing) scanJsxChildren();
  };

  // Returns true for `/>`; leaves `at` after the tag's closing `>`.
  const scanJsxAttributes = (): boolean => {
    let selfClosing = false;
    let open = true;
    skipTrivia();
    while (at < end && open) {
      const c = char();
      if (c === "/" && char(1) === ">") {
        selfClosing = true;
        open = false;
        at += 2;
      } else if (c === ">") {
        open = false;
        at += 1;
      } else if (c === "{") {
        at += 1;
        scanCode("}", false);
        at += 1;
      } else if (ATTRIBUTE_NAME_PART.test(c)) {
        readWhile(ATTRIBUTE_NAME_PART);
        scanJsxAttributeValue();
      } else {
        at += 1;
      }
      if (open) skipTrivia();
    }
    return selfClosing;
  };

  const scanJsxAttributeValue = () => {
    skipTrivia();
    if (char() !== "=") return;
    at += 1;
    skipTrivia();
    const c = char();
    if (c === '"' || c === "'") skipJsxString(c);
    else if (c === "{") {
      at += 1;
      scanCode("}", false);
      at += 1;
    } else if (c === "<") scanJsxElement();
  };

  // Text and child elements up to this element's closing tag, which it consumes.
  const scanJsxChildren = (): void => {
    let closed = false;
    while (at < end && !closed) {
      const c = char();
      if (c === "{") {
        at += 1;
        scanCode("}", false);
        at += 1;
      } else if (c === "<") {
        const close = source.indexOf(">", at);
        closed = /^<\s*\//.test(source.slice(at, at + 8));
        if (closed) at = close < 0 ? end : close + 1;
        else scanJsxElement();
      } else {
        at += 1;
      }
    }
  };

  scanCode("", true);
  return { references, declarations };
};

/**
 * The packages that export a name the program uses.
 *
 * It looks up the identifiers and JSX element names the program references in
 * `index` (export name → package). It over-approximates on purpose, keeping a
 * name it is unsure of: an extra chunk costs a request, a missed name breaks
 * the example. A name the program declares itself is left out (it would only
 * collide), and a name in no package is left out too; react-live reports that
 * as an ordinary "not defined" error.
 *
 * @param code the program source, as the reader sees it in the editor
 * @param index every exported name of every registry package → its package
 * @returns the package names, sorted and without duplicates
 */
export const resolvePackages = (
  code: string,
  index: Record<string, string>,
): string[] => {
  const { references, declarations } = analyzeProgram(code);
  const packages = new Set<string>();
  for (const name of references) {
    // `Object.hasOwn`: a program that says `constructor` or `toString` is not an export.
    if (!declarations.has(name) && Object.hasOwn(index, name)) {
      packages.add(index[name]!);
    }
  }
  return [...packages].sort();
};

/**
 * The packages whose stylesheets a set of packages needs: the packages
 * themselves and everything they use at runtime, transitively. A program that
 * names `ConfirmDialog` never names `Modal` or `Card`, but paints through both.
 *
 * The result is sorted, which is the order the whole registry's styles used to
 * load in: a package overrides the classes of a package it uses (a `Modal`
 * restyles its `Card` through `className`), and with equal specificity the
 * later sheet wins.
 *
 * @param packages the packages a program references
 * @param dependencies each package → the registry packages it uses
 * @returns the package names in stylesheet order, without duplicates
 */
export const stylePackages = (
  packages: string[],
  dependencies: Record<string, string[]>,
): string[] => {
  const closure = new Set<string>();
  const visit = (name: string) => {
    if (closure.has(name)) return;
    closure.add(name);
    (dependencies[name] ?? []).forEach(visit);
  };
  packages.forEach(visit);
  return [...closure].sort();
};
