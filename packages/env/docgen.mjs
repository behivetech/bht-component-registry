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
export const isComponentSource = (file) => file.endsWith(".tsx") && !/\.(spec|example|composition|test)\.tsx$/.test(file);

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

// ---------------------------------------------------------------------------
// Functions: hooks and utilities, read with the TypeScript compiler API
// ---------------------------------------------------------------------------

/**
 * Which files may hold documented functions: the package's own modules, not
 * its examples, tests, barrel or declarations. Components live in `.tsx`
 * too, so the exclusion of PascalCase exports below is what keeps them out.
 */
export const isFunctionSource = (file) =>
  /\.tsx?$/.test(file) && !/\.(spec|example|composition|test)\.tsx?$/.test(file) && !/\.d\.ts$/.test(file) && path.basename(file) !== "index.ts";

export function functionSourceFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(isFunctionSource)
    .map((file) => path.join(dir, file));
}

const FUNCTION_COMPILER_OPTIONS = {
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: true,
  noEmit: true,
};

/** One program for every file passed, the way `createDocgen` is one parser. */
export function createFunctionProgram(files) {
  return ts.createProgram(files, FUNCTION_COMPILER_OPTIONS);
}

const commentText = (parts) => (typeof parts === "string" ? parts : ts.displayPartsToString(parts)).trim();

/** The JSDoc tags of a declaration, by name: `{ param: [...], returns: [...], example: [...] }`. */
function jsDocTags(declaration) {
  const tags = {};
  for (const tag of ts.getJSDocTags(declaration)) {
    const name = tag.tagName.text;
    (tags[name] ??= []).push(tag);
  }
  return tags;
}

/** Tag comment as plain text; `@param foo The thing` gives "The thing". */
const tagText = (tag) => (tag.comment === undefined ? "" : commentText(ts.getTextOfJSDocComment(tag.comment) ?? ""));

/**
 * Shapes one exported function (or exported const holding a function) into
 * a catalog entry: every call signature with its parameters, each parameter's
 * `@param` text, the return type and `@returns` text, and the `@example`
 * blocks as code. A name starting with `use` followed by a capital is a hook.
 */
function documentSymbol(checker, symbol, declaration) {
  const name = symbol.getName();
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const callSignatures = type.getCallSignatures();
  if (callSignatures.length === 0) return null;

  const tags = jsDocTags(declaration);
  const paramDocs = new Map(
    (tags.param ?? []).map((tag) => [tag.name && ts.isIdentifier(tag.name) ? tag.name.text : String(tag.name?.getText() ?? ""), tagText(tag)]),
  );
  const returnsDoc = tags.returns?.[0] ? tagText(tags.returns[0]) : "";
  const examples = (tags.example ?? []).map((tag) => {
    const text = tagText(tag);
    // ```ts fences are allowed in an @example; the code is what we keep.
    const fenced = /^```[a-z]*\n([\s\S]*?)\n```$/.exec(text);
    return fenced ? fenced[1] : text;
  });

  const signatures = callSignatures.map((signature) => {
    const params = signature.getParameters().map((param) => {
      const paramDeclaration = param.valueDeclaration;
      const paramType = checker.getTypeOfSymbolAtLocation(param, paramDeclaration ?? declaration);
      const parameter = paramDeclaration && ts.isParameter(paramDeclaration) ? paramDeclaration : null;
      const optional = Boolean(parameter && (parameter.questionToken || parameter.initializer));
      // The default is the initializer as written (`initial = false` → "false"),
      // the way react-docgen reports a prop default — the source text, not a value.
      const defaultValue = parameter?.initializer ? parameter.initializer.getText() : null;
      return {
        name: param.getName(),
        type: checker.typeToString(paramType, declaration, ts.TypeFormatFlags.NoTruncation),
        optional,
        defaultValue,
        description: paramDocs.get(param.getName()) ?? "",
      };
    });
    const returnType = checker.typeToString(signature.getReturnType(), declaration, ts.TypeFormatFlags.NoTruncation);
    const text = `${name}(${params.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`).join(", ")}): ${returnType}`;
    return { text, params, returns: { type: returnType, description: returnsDoc } };
  });

  return {
    name,
    kind: /^use[A-Z]/.test(name) ? "hook" : "function",
    description: commentText(symbol.getDocumentationComment(checker)),
    signatures,
    examples,
  };
}

/**
 * The documented functions of the files in `dir` that belong to `program`:
 * every export whose name starts with a lowercase letter — hooks (`useX`)
 * and utilities — in source order. PascalCase exports are components and are
 * documented by `toDocs` instead; re-exported names are skipped (they are
 * documented where they are declared).
 */
export function toFunctionDocs(program, dir) {
  const checker = program.getTypeChecker();
  const docs = [];
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || path.dirname(sourceFile.fileName) !== dir || !isFunctionSource(sourceFile.fileName)) continue;
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const name = exported.getName();
      if (!/^[a-z]/.test(name)) continue;
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
      if (!declaration || declaration.getSourceFile() !== sourceFile) continue;
      const doc = documentSymbol(checker, symbol, declaration);
      if (doc) docs.push(doc);
    }
  }
  return docs;
}

/** Function docs for ONE package folder, with its own program. The bin uses this; the site batches instead. */
export function documentFunctions(dir) {
  const files = functionSourceFiles(dir);
  if (files.length === 0) return [];
  return toFunctionDocs(createFunctionProgram(files), dir);
}

export const DOCS_JSON_VERSION = 2;

/** The contents of a package's `docs.json`. */
export function docsJsonFor(dir) {
  return {
    $schema: "https://github.com/behivetech/bht-component-registry/docs.schema.json",
    version: DOCS_JSON_VERSION,
    generatedAt: new Date().toISOString(),
    docs: documentPackage(dir),
    functions: documentFunctions(dir),
  };
}
