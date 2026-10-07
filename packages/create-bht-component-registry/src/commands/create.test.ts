import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MANIFEST } from "../lib/manifest.js";
import { createMemoryLogger } from "../lib/log.js";
import type { Prompter } from "../lib/prompt.js";
import type { Runner } from "../lib/run.js";
import type { TemplateFetcher } from "../lib/template.js";
import { readOwnVersion } from "../lib/version.js";
import { create, DEFAULT_CATEGORIES, DEFAULT_REGISTRY, type CreateOptions } from "./create.js";

const E2E_SPEC = `import { expect, test } from "@playwright/test";
// The example scope (registry/example) ships with the template.
test("home", async ({ page }) => {
  await page.goto("/example");
  await expect(page).toHaveTitle(/Example Component Registry/);
  await expect(page.getByRole("heading", { name: "Example" })).toBeVisible();
  await expect(page.getByText("pnpm add @example/atoms.thing")).toBeVisible();
  await page.keyboard.type('const Example = () => <Thing />; render(<Example />);');
});
`;

async function write(root: string, rel: string, content: string): Promise<void> {
  await mkdir(dirname(join(root, rel)), { recursive: true });
  await writeFile(join(root, rel), content, "utf8");
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

/** A minimal stand-in for the public repo: the files `create` has opinions about. */
async function makeTemplate(dir: string): Promise<void> {
  await write(
    dir,
    "registry.config.json",
    JSON.stringify(
      {
        $schema: "./registry.config.schema.json",
        scope: "example",
        npmRegistry: "https://registry.npmjs.org",
        templateVersion: "0.1.0",
        site: {
          title: "Example Component Registry",
          description: "A bit.dev-style component registry that stays in git.",
          primaryColor: "#6750a4",
          links: [
            { label: "GitHub", href: "https://github.com/behivetech/bht-component-registry" },
            { label: "Hosted & expanded version", href: "https://platform.behivetech.com/expanded" },
          ],
        },
      },
      null,
      2,
    ),
  );
  await write(dir, "template.manifest.json", JSON.stringify(DEFAULT_MANIFEST, null, 2));
  await write(dir, "package.json", JSON.stringify({ name: "bht-component-registry", private: true }));
  await write(dir, "README.md", "# Template\n");
  await write(dir, "registry/example/scope.json", JSON.stringify({ name: "Example", tagline: "Example components." }));
  await write(
    dir,
    "registry/example/atoms/thing/package.json",
    JSON.stringify(
      {
        name: "@example/atoms.thing",
        version: "0.0.0",
        repository: { type: "git", url: "https://github.com/x/y.git", directory: "registry/example/atoms/thing" },
      },
      null,
      2,
    ),
  );
  await write(
    dir,
    "registry/example/atoms/thing/README.md",
    "# Thing\n\n```jsx\nimport { Thing } from '@example/atoms.thing';\n```\n\nFor example, see https://example.com.\n",
  );
  await write(dir, "registry/example/atoms/thing/thing.tsx", "// @example/atoms.thing\nexport const Thing = () => null;\n");
  await write(dir, "registry/example/atoms/thing/logo.png", "not really a png, but binary-ish @example/");
  await write(
    dir,
    "apps/docs/package.json",
    JSON.stringify({ name: "docs", dependencies: { "@example/atoms.thing": "workspace:*", next: "16.0.0" } }, null, 2),
  );
  await write(dir, "apps/docs/e2e/public.spec.ts", E2E_SPEC);
  await write(dir, ".changeset/config.json", "{}");
  await write(dir, ".changeset/fuzzy-cats.md", '---\n"@example/atoms.thing": patch\n---\n\nFix.\n');
  await write(
    dir,
    "pnpm-lock.yaml",
    [
      "importers:",
      "  apps/docs:",
      "    dependencies:",
      "      '@example/atoms.thing':",
      "        specifier: workspace:*",
      "        version: link:../../registry/example/atoms/thing",
      "  registry/example/atoms/thing: {}",
      "",
    ].join("\n"),
  );
  // Things a checkout has that a template never ships.
  await write(dir, "node_modules/junk/index.js", "// not copied");
  await write(dir, "apps/docs/src/generated/catalog.ts", "// not copied");
  await write(dir, "registry/example/atoms/thing/dist/index.js", "// not copied");
  await write(dir, "registry/example/atoms/thing/docs.json", "{}");
  await write(dir, "apps/docs/test-results/.last-run.json", "{}");
  await write(dir, "apps/docs/playwright-report/index.html", "<html></html>");
  // Template-only: the CLI's own source and the template repo's contributor templates.
  await write(dir, "packages/scope/package.json", '{ "name": "@bht-component-registry/scope" }');
  await write(dir, "packages/create-bht-component-registry/package.json", '{ "name": "create-bht-component-registry" }');
  await write(dir, "packages/create-bht-component-registry/src/cli.ts", "// the CLI itself");
  await write(dir, ".github/workflows/ci.yml", "name: CI\n");
  await write(dir, ".github/ISSUE_TEMPLATE/bug.yml", "name: Bug\n");
  await write(dir, ".github/PULL_REQUEST_TEMPLATE.md", "# PR\n");
}

const neverPrompt: Prompter = {
  text: async () => {
    throw new Error("prompt called");
  },
  confirm: async () => {
    throw new Error("prompt called");
  },
};

describe("create", () => {
  let tmp: string;
  let templateDir: string;
  let pnpmCalls: string[][];
  const recordingPnpm: Runner = async (args) => {
    pnpmCalls.push(args);
    return 0;
  };

  function run(options: Partial<CreateOptions>, runPnpm: Runner = recordingPnpm) {
    const memory = createMemoryLogger();
    return create(
      { dir: "out", scope: "bobsburgers", install: false, yes: true, from: templateDir, ...options },
      { cwd: tmp, log: memory.log, prompt: neverPrompt, runPnpm },
    ).then((code) => ({ code, lines: memory.lines, target: join(tmp, "out") }));
  }

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "bht-create-"));
    templateDir = join(tmp, "template");
    await makeTemplate(templateDir);
    pnpmCalls = [];
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("renames the example scope everywhere and writes the owner's config", async () => {
    const { code, target, lines } = await run({});
    expect(code).toBe(0);

    expect(existsSync(join(target, "registry/example"))).toBe(false);
    const pkg = await readJson(join(target, "registry/bobsburgers/atoms/thing/package.json"));
    expect(pkg.name).toBe("@bobsburgers/atoms.thing");
    expect((pkg.repository as { directory: string }).directory).toBe("registry/bobsburgers/atoms/thing");
    expect(await readJson(join(target, "registry/bobsburgers/scope.json"))).toEqual({
      name: "Bobsburgers",
      tagline: "Example components.",
    });

    const readme = await readFile(join(target, "registry/bobsburgers/atoms/thing/README.md"), "utf8");
    expect(readme).toContain("from '@bobsburgers/atoms.thing'");
    // The narrow rewrite leaves prose and unrelated domains alone.
    expect(readme).toContain("For example, see https://example.com.");
    expect(await readFile(join(target, "registry/bobsburgers/atoms/thing/thing.tsx"), "utf8")).toContain("@bobsburgers/atoms.thing");
    // Binaries are copied, never rewritten.
    expect(await readFile(join(target, "registry/bobsburgers/atoms/thing/logo.png"), "utf8")).toContain("@example/");

    const docsPkg = await readJson(join(target, "apps/docs/package.json"));
    expect(Object.keys(docsPkg.dependencies as object)).toEqual(["@bobsburgers/atoms.thing", "next"]);

    const spec = await readFile(join(target, "apps/docs/e2e/public.spec.ts"), "utf8");
    expect(spec).toContain('page.goto("/bobsburgers")');
    expect(spec).toContain("/Bobsburgers Component Registry/");
    expect(spec).toContain('{ name: "Bobsburgers" }');
    expect(spec).toContain("pnpm add @bobsburgers/atoms.thing");
    expect(spec).toContain("const Example = () => <Thing />; render(<Example />);");
    expect(spec).not.toContain("/example");

    expect(await readFile(join(target, ".changeset/fuzzy-cats.md"), "utf8")).toContain('"@bobsburgers/atoms.thing": patch');

    // The lockfile follows the rename so `pnpm install --frozen-lockfile` still works.
    const lock = await readFile(join(target, "pnpm-lock.yaml"), "utf8");
    expect(lock).toContain("'@bobsburgers/atoms.thing':");
    expect(lock).toContain("link:../../registry/bobsburgers/atoms/thing");
    expect(lock).toContain("  registry/bobsburgers/atoms/thing: {}");
    expect(lock).not.toContain("example");

    const config = await readJson(join(target, "registry.config.json"));
    expect(config).toEqual({
      $schema: "./registry.config.schema.json",
      scope: "bobsburgers",
      npmRegistry: DEFAULT_REGISTRY,
      templateVersion: readOwnVersion(),
      site: {
        title: "Bobsburgers Component Registry",
        description: "A bit.dev-style component registry that stays in git.",
        primaryColor: "#6750a4",
        links: [{ label: "Hosted & expanded version", href: "https://platform.behivetech.com/expanded" }],
      },
    });

    expect(pnpmCalls).toEqual([]);
    expect(lines.some((line) => line.includes("https://www.npmjs.com/org/create"))).toBe(true);
    expect(lines.some((line) => line.includes("https://platform.behivetech.com/expanded"))).toBe(true);
    expect(lines.some((line) => line.includes("docs/getting-started.md"))).toBe(true);
  });

  it("leaves installs, build output and generated data out of the copy", async () => {
    const { target } = await run({});
    expect(existsSync(join(target, "node_modules"))).toBe(false);
    expect(existsSync(join(target, "apps/docs/src/generated"))).toBe(false);
    expect(existsSync(join(target, "registry/bobsburgers/atoms/thing/dist"))).toBe(false);
    expect(existsSync(join(target, "registry/bobsburgers/atoms/thing/docs.json"))).toBe(false);
    expect(existsSync(join(target, "apps/docs/test-results"))).toBe(false);
    expect(existsSync(join(target, "apps/docs/playwright-report"))).toBe(false);
    expect(existsSync(join(target, "template.manifest.json"))).toBe(true);
  });

  it("never materialises template-only paths, not even as empty folders", async () => {
    const { target } = await run({});
    expect(existsSync(join(target, "packages/create-bht-component-registry"))).toBe(false);
    expect(existsSync(join(target, ".github/ISSUE_TEMPLATE"))).toBe(false);
    expect(existsSync(join(target, ".github/PULL_REQUEST_TEMPLATE.md"))).toBe(false);
    // Neighbours that are merely owned still arrive.
    expect(existsSync(join(target, "packages/scope/package.json"))).toBe(true);
    expect(existsSync(join(target, ".github/workflows/ci.yml"))).toBe(true);
  });

  it("creates the chosen categories, marking empty ones with .gitkeep", async () => {
    const { target } = await run({ categories: ["atoms", "molecules"] });
    expect(existsSync(join(target, "registry/bobsburgers/atoms/.gitkeep"))).toBe(false);
    expect(existsSync(join(target, "registry/bobsburgers/molecules/.gitkeep"))).toBe(true);
    expect(existsSync(join(target, "registry/bobsburgers/organisms"))).toBe(false);
  });

  it("uses the default categories, registry and template version with --yes", async () => {
    const { target } = await run({ templateVersion: "0.4.2", registry: "https://npm.pkg.github.com/" });
    for (const category of DEFAULT_CATEGORIES) {
      expect(existsSync(join(target, "registry/bobsburgers", category))).toBe(true);
    }
    const config = await readJson(join(target, "registry.config.json"));
    expect(config.templateVersion).toBe("0.4.2");
    expect(config.npmRegistry).toBe("https://npm.pkg.github.com");
  });

  it("title-cases a hyphenated scope and keeps the e2e identifier valid", async () => {
    const { target } = await run({ scope: "acme-corp" });
    expect(await readJson(join(target, "registry/acme-corp/scope.json"))).toMatchObject({ name: "Acme Corp" });
    const config = await readJson(join(target, "registry.config.json"));
    expect((config.site as { title: string }).title).toBe("Acme Corp Component Registry");
    const spec = await readFile(join(target, "apps/docs/e2e/public.spec.ts"), "utf8");
    expect(spec).toContain("/Acme Corp Component Registry/");
    expect(spec).toContain("const Example = () => <Thing />");
  });

  it("refuses an invalid, reserved or missing scope before touching the disk", async () => {
    for (const [scope, message] of [
      ["Bad Scope", "Scope must be lowercase letters, digits and hyphens"],
      ["dashboard", "'dashboard' is reserved"],
      ["", "Scope is required"],
    ] as const) {
      const { code, lines, target } = await run({ scope });
      expect(code).toBe(1);
      expect(lines.join("\n")).toContain(message);
      expect(existsSync(target)).toBe(false);
    }
    const { code, lines } = await run({ scope: undefined });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("--yes needs --scope");
  });

  it("refuses a directory that exists and is not empty", async () => {
    await write(join(tmp, "out"), "keep.txt", "mine");
    const { code, lines } = await run({});
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("already exists and is not empty");
    expect(await readFile(join(tmp, "out/keep.txt"), "utf8")).toBe("mine");
  });

  it("takes the template from an injected fetcher when --from is not given", async () => {
    let cleaned = false;
    const fetchTemplate: TemplateFetcher = async (request) => {
      expect(request.version).toBe("0.9.0");
      expect(request.from).toBeUndefined();
      return {
        dir: templateDir,
        source: "stub",
        cleanup: async () => {
          cleaned = true;
        },
      };
    };
    const memory = createMemoryLogger();
    const code = await create(
      { dir: "out", scope: "bobsburgers", templateVersion: "0.9.0", install: false, yes: true },
      { cwd: tmp, log: memory.log, prompt: neverPrompt, fetchTemplate, runPnpm: recordingPnpm },
    );
    expect(code).toBe(0);
    expect(cleaned).toBe(true);
    expect(existsSync(join(tmp, "out/registry/bobsburgers/scope.json"))).toBe(true);
  });

  it("runs pnpm install then pnpm build in the new directory unless --no-install", async () => {
    const cwds: string[] = [];
    const runPnpm: Runner = async (args, cwd) => {
      pnpmCalls.push(args);
      cwds.push(cwd);
      return 0;
    };
    const { code, lines } = await run({ install: true }, runPnpm);
    expect(code).toBe(0);
    expect(pnpmCalls).toEqual([["install"], ["build"]]);
    expect(cwds).toEqual([join(tmp, "out"), join(tmp, "out")]);
    // Already installed, so the next steps skip `pnpm install`.
    expect(lines).not.toContain("  pnpm install");
  });

  it("names the failing pnpm step, exits 1 and leaves the directory in place", async () => {
    const runPnpm: Runner = async (args) => (args[0] === "build" ? 2 : 0);
    const { code, lines, target } = await run({ install: true }, runPnpm);
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("pnpm build failed (exit code 2)");
    expect(existsSync(join(target, "registry.config.json"))).toBe(true);
  });

  it("refuses to scaffold inside the template checkout", async () => {
    const memory = createMemoryLogger();
    const code = await create(
      { dir: "template/nested", scope: "bobsburgers", install: false, yes: true, from: templateDir },
      { cwd: tmp, log: memory.log, prompt: neverPrompt, runPnpm: recordingPnpm },
    );
    expect(code).toBe(1);
    expect(memory.lines.join("\n")).toContain("inside the template checkout");
  });
});
