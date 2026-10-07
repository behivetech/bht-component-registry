/**
 * Builds the registry catalog: src/generated/catalog.json and
 * src/generated/registry-scope.ts.
 *
 * Runs before `next dev` and `next build` (see package.json). Parsing
 * TypeScript for every package takes seconds and none of it can change
 * between deploys, so it belongs in the build — and every public page can be
 * statically generated from the result. There is no database: everything the
 * site shows comes from files in this repo.
 *
 * Source of truth is the folder tree:
 *   registry/<scope>/<category>/<name>  →  @<scope>/<category>.<name>
 * plus registry.config.json (scope, registry, site branding),
 * registry/<scope>/scope.json (name, tagline, visibility, tokens) and each
 * package's `registry` field (status, tags).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { componentSourceFiles, createDocgen, toDocs } from "@bht-component-registry/env/docgen";
import type {
  Catalog,
  CatalogComponent,
  CatalogExample,
  CatalogScope,
  CatalogSite,
  CatalogSourceFile,
  CatalogStatus,
} from "../src/lib/catalog/types";
import { extractTokens, humanizeTitle, parseChangelog, readmeSummary, readmeTitle, splitPascal, stripTitle, toTitle } from "../src/lib/catalog/parse";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(APP_DIR, "../..");
const REGISTRY_DIR = path.join(REPO_ROOT, "registry");
const OUT_DIR = path.join(APP_DIR, "src/generated");
const require = createRequire(path.join(APP_DIR, "package.json"));

// Category order is display order — atomic design, smallest first.
const CATEGORIES = [
  { key: "atoms", label: "Atoms" },
  { key: "molecules", label: "Molecules" },
  { key: "organisms", label: "Organisms" },
  { key: "templates", label: "Templates" },
  { key: "forms", label: "Forms" },
  { key: "utils", label: "Utilities" },
  { key: "theme", label: "Theme" },
];

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const readText = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");

// ---------------------------------------------------------------------------
// registry.config.json — the repo's own settings
// ---------------------------------------------------------------------------

interface RegistryConfig {
  scope: string;
  npmRegistry: string;
  templateVersion: string;
  site: { title: string; description?: string; logo?: string; primaryColor?: string; links?: { label: string; href: string }[] };
}

function readConfig(): RegistryConfig {
  const file = path.join(REPO_ROOT, "registry.config.json");
  if (!fs.existsSync(file)) {
    throw new Error("registry.config.json is missing at the repo root. See docs/scopes.md.");
  }
  const config = readJson(file) as Partial<RegistryConfig>;
  for (const key of ["scope", "npmRegistry", "site"] as const) {
    if (!config[key]) throw new Error(`registry.config.json: "${key}" is required.`);
  }
  if (!config.site?.title) throw new Error('registry.config.json: "site.title" is required.');
  return config as RegistryConfig;
}

function siteFromConfig(config: RegistryConfig): CatalogSite {
  return {
    title: config.site.title,
    description: config.site.description ?? null,
    logo: config.site.logo ?? null,
    primaryColor: config.site.primaryColor ?? null,
    links: config.site.links ?? [],
  };
}

// ---------------------------------------------------------------------------
// package.json `registry` field — status and tags, curated in code
// ---------------------------------------------------------------------------

const STATUSES: ReadonlySet<CatalogStatus> = new Set<CatalogStatus>(["DRAFT", "BETA", "STABLE", "DEPRECATED"]);

function registryMeta(pkg: Record<string, unknown>, packageName: string, warnings: string[]): { status: CatalogStatus; tags: string[] } {
  const field = (pkg.registry ?? {}) as { status?: unknown; tags?: unknown };
  let status: CatalogStatus = "STABLE";
  if (field.status !== undefined) {
    const upper = String(field.status).toUpperCase() as CatalogStatus;
    if (STATUSES.has(upper)) status = upper;
    else warnings.push(`${packageName}: registry.status "${String(field.status)}" is not one of draft, beta, stable, deprecated — using stable`);
  }
  const tags = Array.isArray(field.tags)
    ? [...new Set(field.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 8)
    : [];
  return { status, tags };
}

// ---------------------------------------------------------------------------
// Live examples from *.composition.tsx
// ---------------------------------------------------------------------------

function declaredNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .map((d) => (ts.isIdentifier(d.name) ? d.name.text : ""))
      .filter(Boolean);
  }
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name.text];
  }
  return [];
}

const isExported = (statement: ts.Statement) =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

function leadingDoc(statement: ts.Statement, sourceText: string): string {
  const ranges = ts.getLeadingCommentRanges(sourceText, statement.pos) ?? [];
  const jsdoc = ranges
    .map((r) => sourceText.slice(r.pos, r.end))
    .filter((c) => c.startsWith("/**"))
    .pop();
  if (!jsdoc) return "";
  return jsdoc
    .replace(/^\/\*\*|\*\/$/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Each exported component in a composition file becomes a standalone
 * react-live program. Imports are dropped — every package export is already
 * in the sandbox scope — and each example carries only the file-level helpers
 * it references (fixtures, interfaces), so the editor shows the ten lines
 * that matter rather than the whole file.
 */
function extractExamples(file: string): CatalogExample[] {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const helpers: { names: string[]; text: string }[] = [];
  const exported: { name: string; text: string; doc: string }[] = [];

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) continue;
    const names = declaredNames(statement);
    const text = statement.getText(source);
    const isComponent = isExported(statement) && names.length === 1 && /^[A-Z]/.test(names[0]!);
    if (isComponent) {
      exported.push({ name: names[0]!, text: text.replace(/^export\s+/, ""), doc: leadingDoc(statement, sourceText) });
    } else {
      helpers.push({ names, text: text.replace(/^export\s+/, "") });
    }
  }

  const references = (code: string, name: string) => new RegExp(`\\b${name}\\b`).test(code);

  return exported.map(({ name, text, doc }) => {
    // Pull helpers in transitively: a fixture can reference a type, which can
    // reference another fixture.
    const included = new Set<number>();
    let body = text;
    let grew = true;
    while (grew) {
      grew = false;
      helpers.forEach((helper, index) => {
        if (!included.has(index) && helper.names.some((n) => references(body, n))) {
          included.add(index);
          body = `${helper.text}\n${body}`;
          grew = true;
        }
      });
    }
    const preamble = [...included].sort((a, b) => a - b).map((index) => helpers[index]!.text).join("\n\n");
    return {
      name,
      title: splitPascal(name),
      description: doc,
      code: `${preamble ? `${preamble}\n\n` : ""}${text}\n\nrender(<${name} />);\n`,
    };
  });
}

// ---------------------------------------------------------------------------

const LANGUAGE: Record<string, CatalogSourceFile["language"]> = {
  ".tsx": "tsx",
  ".ts": "ts",
  ".scss": "scss",
  ".json": "json",
  ".md": "markdown",
};

/** The files worth showing on the Code tab — the component's own source, not its tooling. */
function sourceFiles(dir: string): CatalogSourceFile[] {
  const skip = new Set(["package.json", "tsconfig.json", "tsup.config.ts", "eslint.config.mjs", "global.d.ts", "CHANGELOG.md", "README.md", "docs.json"]);
  return fs
    .readdirSync(dir)
    .filter((f) => !skip.has(f) && LANGUAGE[path.extname(f)] && fs.statSync(path.join(dir, f)).isFile())
    .sort((a, b) => {
      // The component itself first, then its styles, then everything else.
      const rank = (f: string) => (f.endsWith(".spec.tsx") ? 4 : f.endsWith(".composition.tsx") ? 3 : f === "index.ts" ? 2 : f.endsWith(".scss") ? 1 : 0);
      return rank(a) - rank(b) || a.localeCompare(b);
    })
    .map((f) => ({ path: f, language: LANGUAGE[path.extname(f)]!, content: fs.readFileSync(path.join(dir, f), "utf8") }));
}

/** registry/<slug>/scope.json: name, tagline, visibility and an optional tokens.scss path. */
function readScope(slug: string, componentCount: number): CatalogScope {
  const scopeDir = path.join(REGISTRY_DIR, slug);
  const manifestFile = path.join(scopeDir, "scope.json");
  const manifest = fs.existsSync(manifestFile) ? (readJson(manifestFile) as Partial<CatalogScope> & { tokens?: string }) : {};
  const tokensPath = manifest.tokens ? path.relative(REPO_ROOT, path.join(scopeDir, manifest.tokens)) : null;
  if (tokensPath && !fs.existsSync(path.join(REPO_ROOT, tokensPath))) {
    throw new Error(`registry/${slug}/scope.json points at tokens "${manifest.tokens}" but ${tokensPath} does not exist.`);
  }
  return {
    slug,
    name: manifest.name ?? toTitle(slug),
    tagline: manifest.tagline ?? null,
    visibility: manifest.visibility === "private" ? "private" : "public",
    componentCount,
    tokensPath,
  };
}

async function main() {
  const started = Date.now();
  const config = readConfig();
  const warnings: string[] = [];
  const entries: { scope: string; category: string; name: string; dir: string; pkg: Record<string, unknown> }[] = [];

  if (!fs.existsSync(REGISTRY_DIR)) {
    throw new Error("No registry/ folder. Create one with `pnpm gen` — see docs/components.md.");
  }

  for (const scope of fs.readdirSync(REGISTRY_DIR).sort()) {
    const scopeDir = path.join(REGISTRY_DIR, scope);
    if (!fs.statSync(scopeDir).isDirectory() || scope.startsWith(".")) continue;
    for (const category of fs.readdirSync(scopeDir).sort()) {
      const categoryDir = path.join(scopeDir, category);
      if (!fs.statSync(categoryDir).isDirectory()) continue;
      for (const name of fs.readdirSync(categoryDir).sort()) {
        const dir = path.join(categoryDir, name);
        const pkgFile = path.join(dir, "package.json");
        if (!fs.existsSync(pkgFile)) continue;
        entries.push({ scope, category, name, dir, pkg: readJson(pkgFile) });
      }
    }
  }

  // ONE parser (one TypeScript program) for every source file in the registry.
  const parsed = createDocgen().parse(entries.flatMap(({ dir }) => componentSourceFiles(dir)));

  const components: CatalogComponent[] = [];
  const failures: string[] = [];

  for (const { scope, category, name, dir, pkg } of entries) {
    const packageName = String(pkg.name);
    const expected = `@${scope}/${category}.${name}`;
    if (packageName !== expected) {
      warnings.push(`${dir}: package.json name is "${packageName}" but the folder says "${expected}" — the folder tree is the registry; rename one to match`);
    }
    const readme = readText(path.join(dir, "README.md"));
    const docs = toDocs(parsed, dir);

    const examples = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".composition.tsx"))
      .flatMap((f) => extractExamples(path.join(dir, f)));

    const exportsField = pkg.exports as Record<string, unknown> | undefined;
    const hasStyles = Boolean(exportsField?.["./styles.css"]) && fs.existsSync(path.join(dir, "dist/index.css"));

    // Import the BUILT package for its export names — the same artifact the
    // sandbox will import. A package that hasn't been built yet is reported
    // rather than silently documented with no exports.
    let exportNames: string[] = [];
    try {
      const mod = await import(require.resolve(packageName));
      exportNames = Object.keys(mod).filter((n) => /^[A-Z]/.test(n) || /^(use|show|create)[A-Z]/.test(n));
    } catch (error) {
      failures.push(`${packageName}: ${(error as Error).message.split("\n")[0]}`);
    }

    const deps = { ...(pkg.dependencies as Record<string, string> | undefined), ...(pkg.peerDependencies as Record<string, string> | undefined) };
    const { status, tags } = registryMeta(pkg, packageName, warnings);

    components.push({
      scope,
      category,
      name,
      packageName,
      version: String(pkg.version),
      title: humanizeTitle(readmeTitle(readme) ?? toTitle(name)),
      summary: (pkg.description as string | undefined) || readmeSummary(readme) || docs[0]?.description || "",
      readme: stripTitle(readme),
      status,
      tags,
      docs,
      examples,
      files: sourceFiles(dir),
      releases: parseChangelog(readText(path.join(dir, "CHANGELOG.md"))),
      exportNames,
      hasStyles,
      sourcePath: path.relative(REPO_ROOT, dir),
      dependencies: Object.keys(deps).filter((d) => d.startsWith("@") && entries.some((e) => e.pkg.name === d)),
    });
  }

  const scopes = [...new Set(entries.map((e) => e.scope))].map((slug) =>
    readScope(slug, components.filter((c) => c.scope === slug).length),
  );
  if (!scopes.some((s) => s.slug === config.scope)) {
    warnings.push(`registry.config.json names "${config.scope}" as the primary scope but registry/${config.scope}/ has no packages yet`);
  }

  // The sandbox imports every registry package, so every one has to be a
  // dependency of this app. Adding a component to the registry (pnpm gen)
  // then only needs `pnpm install` — nobody has to remember a second list.
  const appPkgFile = path.join(APP_DIR, "package.json");
  const appPkg = readJson(appPkgFile) as { dependencies: Record<string, string> };
  const missing = components.map((c) => c.packageName).filter((name) => !appPkg.dependencies[name]);
  if (missing.length > 0) {
    for (const name of missing) appPkg.dependencies[name] = "workspace:*";
    appPkg.dependencies = Object.fromEntries(Object.entries(appPkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(appPkgFile, `${JSON.stringify(appPkg, null, 2)}\n`);
    console.log(`added ${missing.length} registry package(s) to apps/docs/package.json — run \`pnpm install\`:`);
    for (const name of missing) console.log(`  + ${name}`);
  }

  // Design tokens: the first scope that declares a tokens.scss provides the
  // page; with none, the page and its nav link are hidden.
  const tokensScope = scopes.find((s) => s.tokensPath);
  const tokens = tokensScope ? extractTokens(readText(path.join(REPO_ROOT, tokensScope.tokensPath!))) : null;

  const catalog: Catalog = {
    generatedAt: new Date().toISOString(),
    primaryScope: config.scope,
    npmRegistry: config.npmRegistry,
    site: siteFromConfig(config),
    categories: CATEGORIES,
    scopes,
    components,
    tokens,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);

  // A real module with static imports, not a runtime `import()` by name: the
  // bundler has to see every import to include the package and its CSS.
  const scopeModule = [
    "// GENERATED by scripts/generate-catalog.ts — do not edit.",
    "",
    ...components.flatMap((c, i) => [
      `import * as m${i} from "${c.packageName}";`,
      ...(c.hasStyles ? [`import "${c.packageName}/styles.css";`] : []),
    ]),
    "",
    "export const registryModules: Record<string, Record<string, unknown>> = {",
    ...components.map((c, i) => `  "${c.packageName}": m${i},`),
    "};",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "registry-scope.ts"), scopeModule);

  const exampleCount = components.reduce((n, c) => n + c.examples.length, 0);
  console.log(
    `catalog: ${scopes.length} scope(s), ${components.length} component(s), ${exampleCount} live example(s)${tokens ? ", tokens" : ""} — ${Date.now() - started}ms`,
  );
  for (const warning of warnings) console.warn(`  ! ${warning}`);
  for (const failure of failures) console.warn(`  ! ${failure}`);
  if (failures.length > 0) {
    console.error("\nSome packages have no build output. Run `pnpm build --filter='./registry/*/*/*'` first.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
