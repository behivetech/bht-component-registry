/**
 * Turns a README code block into something react-live can run.
 *
 * READMEs are written for humans copying into an app: they start with
 * imports and show either a bare JSX expression or a small component. The
 * sandbox already has every export in scope, so imports go; a declared
 * component gets a `render(...)` call; anything else is treated as one JSX
 * expression, wrapped in a fragment so sibling elements are allowed.
 */
export function snippetToLiveCode(source: string): { code: string; noInline: boolean } {
  const withoutImports = source
    .split("\n")
    .filter((line) => !/^\s*import\s.*from\s+['"][^'"]+['"];?\s*$/.test(line))
    .join("\n")
    .trim();

  // A snippet that defines a component (README "full example" style).
  const declared =
    withoutImports.match(/^(?:export\s+)?function\s+([A-Z]\w*)\s*\(/m)?.[1] ??
    withoutImports.match(/^(?:export\s+)?const\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)?\s*=>/m)?.[1];
  if (declared) {
    return { code: `${withoutImports.replace(/^export\s+/gm, "")}\n\nrender(<${declared} />);`, noInline: true };
  }

  // A snippet using hooks at the top level can't run as a bare expression;
  // wrap it in a component so the hooks have somewhere to live.
  if (/^\s*(?:const|let)\s.*=\s*use[A-Z]/m.test(withoutImports)) {
    // The first line that opens a tag starts the JSX; everything before it is
    // setup. (The last such line would be the closing tag of a multi-line
    // element, which would leave the opening tags in the setup region.)
    const jsxStart = withoutImports.indexOf("\n<");
    const setup = jsxStart === -1 ? "" : withoutImports.slice(0, jsxStart);
    const jsx = jsxStart === -1 ? withoutImports : withoutImports.slice(jsxStart + 1);
    return {
      code: `function Example() {\n${setup}\n  return (\n<>\n${jsx.replace(/;\s*$/, "")}\n</>\n  );\n}\n\nrender(<Example />);`,
      noInline: true,
    };
  }

  return { code: `<>\n${withoutImports.replace(/;\s*$/, "")}\n</>`, noInline: false };
}
