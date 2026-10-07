import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { withCompilerOptions } from "react-docgen-typescript";

/**
 * The ONE way props are read from a component's TypeScript.
 *
 * Two things use it: the docs site's catalog step, which parses every package
 * in the registry in a single TypeScript program at build time, and the
 * `bht-registry-docgen` bin, which a package's own build runs to write
 * `docs.json` into the package before it is published. Sharing the parser
 * options and the shaping code here is what guarantees the site and a
 * published tarball describe a component identically.
 */

/** Which files in a package folder hold components (not examples, not tests). */
export const isComponentSource = (file) => file.endsWith(".tsx") && !/\.(spec|composition|test)\.tsx$/.test(file);

export function componentSourceFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(isComponentSource)
    .map((file) => path.join(dir, file));
}

/**
 * One parser (one TypeScript program) for every file passed to `parse`. A
 * parser per file rebuilds the program each time, which is what made the old
 * request-time approach take seconds per page.
 */
export function createDocgen() {
  return withCompilerOptions(
    {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    },
    {
      savePropValueAsString: true,
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // Declared-in-this-repo props only. Everything inherited from
      // `HTMLAttributes` or a Radix primitive would bury the five props that
      // matter under three hundred that don't.
      propFilter: (prop) => !prop.parent || !prop.parent.fileName.includes("node_modules"),
    },
  );
}

/**
 * The type to print for a prop. A union of literals is shown as its members
 * (`"primary" | "secondary"`) rather than the alias that names it
 * (`ButtonVariant`) — the members are what a caller needs to know, and the
 * alias is one click away on the Code tab.
 */
export function propType(prop) {
  if (prop.type.name === "enum" && Array.isArray(prop.type.value)) {
    const members = prop.type.value.map((v) => v.value);
    if (members.length > 0 && members.length <= 12) return members.join(" | ");
  }
  return prop.type.raw && prop.type.raw.length < 120 ? prop.type.raw : prop.type.name;
}

/** Whether the props interface also extends native HTML / Radix attributes (which are not listed). */
export function inheritsNative(source, displayName) {
  const match = source.match(new RegExp(`interface\\s+${displayName}Props[^{]*extends\\s+([^{]+)\\{`));
  return Boolean(match && /HTMLAttributes|Props|Radix|Omit</.test(match[1]));
}

/**
 * Shapes react-docgen's output for the components found in `dir` into the
 * catalog's `docs` entries: one per exported component, props sorted with
 * required first, components with the most props first.
 */
export function toDocs(parsed, dir) {
  return parsed
    .filter((doc) => path.dirname(doc.filePath) === dir && /^[A-Z]/.test(doc.displayName))
    .map((doc) => ({
      displayName: doc.displayName,
      description: doc.description,
      extendsNative: inheritsNative(fs.readFileSync(doc.filePath, "utf8"), doc.displayName),
      props: Object.values(doc.props)
        .map((prop) => ({
          name: prop.name,
          type: propType(prop),
          required: prop.required,
          defaultValue: prop.defaultValue?.value != null ? String(prop.defaultValue.value) : null,
          description: prop.description,
        }))
        .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.props.length - a.props.length);
}

/** Props docs for ONE package folder, with its own parser. The bin uses this; the site batches instead. */
export function documentPackage(dir, parser = createDocgen()) {
  const files = componentSourceFiles(dir);
  if (files.length === 0) return [];
  return toDocs(parser.parse(files), dir);
}

export const DOCS_JSON_VERSION = 1;

/** The contents of a package's `docs.json`. */
export function docsJsonFor(dir) {
  return {
    $schema: "https://github.com/behivetech/bht-component-registry/docs.schema.json",
    version: DOCS_JSON_VERSION,
    generatedAt: new Date().toISOString(),
    docs: documentPackage(dir),
  };
}
