import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryLogger } from "../lib/log.js";
import { DEFAULT_MANIFEST, DEFAULT_README_MARKER } from "../lib/manifest.js";
import type { Prompter } from "../lib/prompt.js";
import type { TemplateFetcher } from "../lib/template.js";
import { update, type UpdateOptions } from "./update.js";

const MARKER = DEFAULT_README_MARKER;

async function write(root: string, rel: string, content: string): Promise<void> {
  await mkdir(dirname(join(root, rel)), { recursive: true });
  await writeFile(join(root, rel), content, "utf8");
}

function config(scope: string, templateVersion: string): string {
  return `${JSON.stringify(
    {
      $schema: "./registry.config.schema.json",
      scope,
      npmRegistry: "https://registry.npmjs.org",
      templateVersion,
      site: { title: `${scope} registry` },
    },
    null,
    2,
  )}\n`;
}

const manifest = JSON.stringify(DEFAULT_MANIFEST, null, 2);

/** A registry created from template 0.1.0, with the owner's work layered on. */
async function makeInstalled(dir: string): Promise<void> {
  await write(dir, "registry.config.json", config("bobsburgers", "0.1.0"));
  await write(dir, "template.manifest.json", manifest);
  await write(dir, "package.json", '{ "name": "bht-component-registry", "version": "0.1.0" }\n');
  await write(dir, "apps/docs/src/app/page.tsx", "// template 0.1.0, locally edited by the owner\n");
  await write(dir, "apps/docs/src/app/legacy.tsx", "// removed upstream in 0.2.0\n");
  await write(dir, "apps/docs/e2e/public.spec.ts", 'await page.goto("/bobsburgers"); // 0.1.0\n');
  await write(dir, "apps/docs/package.json", '{ "dependencies": { "@bobsburgers/atoms.thing": "workspace:*" } }\n');
  await write(dir, "registry/bobsburgers/scope.json", '{ "name": "Bobsburgers" }\n');
  await write(dir, "registry/bobsburgers/atoms/thing/package.json", '{ "name": "@bobsburgers/atoms.thing" }\n');
  await write(dir, ".changeset/config.json", '{ "access": "restricted" }\n');
  await write(dir, ".changeset/my-pending-change.md", '---\n"@bobsburgers/atoms.thing": minor\n---\n\nMine.\n');
  await write(dir, "README.md", `# Bobsburgers (template 0.1.0 intro)\n\n${MARKER}\n\n## Our notes\n\nDeploy on Fridays.\n`);
  await write(dir, "pnpm-lock.yaml", "lockfileVersion: 9\n");
  await write(dir, "node_modules/junk/index.js", "// never listed\n");
  // Left behind by an older template that still shipped the CLI and the contributor templates.
  await write(dir, "packages/create-bht-component-registry/src/cli.ts", "// old CLI copy\n");
  await write(dir, ".github/PULL_REQUEST_TEMPLATE.md", "# template repo PR checklist\n");
  await write(dir, ".github/workflows/ci.yml", "name: CI 0.1.0\n");
}

/** Template release 0.2.0: one owned file changed, one added, one removed, README intro changed. */
async function makeTarget(dir: string): Promise<void> {
  await write(dir, "registry.config.json", config("example", "0.2.0"));
  await write(dir, "template.manifest.json", manifest);
  await write(dir, "package.json", '{ "name": "bht-component-registry", "version": "0.2.0" }\n');
  await write(dir, "apps/docs/src/app/page.tsx", "// template 0.2.0\n");
  await write(dir, "apps/docs/src/app/new-feature.tsx", "// new in 0.2.0\n");
  await write(dir, "apps/docs/e2e/public.spec.ts", 'await page.goto("/example"); // 0.2.0\n');
  await write(dir, "apps/docs/package.json", '{ "dependencies": { "@example/atoms.thing": "workspace:*" } }\n');
  await write(dir, "registry/example/scope.json", '{ "name": "Example" }\n');
  await write(dir, "registry/example/atoms/thing/package.json", '{ "name": "@example/atoms.thing" }\n');
  await write(dir, ".changeset/config.json", '{ "access": "restricted" }\n');
  await write(dir, ".changeset/template-pending.md", '---\n"@example/atoms.thing": patch\n---\n\nTemplate.\n');
  await write(dir, "README.md", `# Component Registry (template 0.2.0 intro)\n\n${MARKER}\n\n## Your notes\n\nReplace me.\n`);
  // The template repo carries these, a client never should.
  await write(dir, "packages/create-bht-component-registry/src/cli.ts", "// CLI 0.2.0\n");
  await write(dir, ".github/ISSUE_TEMPLATE/bug.yml", "name: Bug\n");
  await write(dir, ".github/PULL_REQUEST_TEMPLATE.md", "# PR\n");
  await write(dir, ".github/workflows/ci.yml", "name: CI 0.2.0\n");
}

const neverPrompt: Prompter = {
  text: async () => {
    throw new Error("prompt called");
  },
  confirm: async () => {
    throw new Error("prompt called");
  },
};

describe("update", () => {
  let tmp: string;
  let repo: string;
  let target: string;

  function run(options: Partial<UpdateOptions> = {}, clean = true, cwd?: string) {
    const memory = createMemoryLogger();
    return update(
      { from: target, dryRun: false, yes: true, ...options },
      { cwd: cwd ?? repo, log: memory.log, prompt: neverPrompt, isTreeClean: async () => clean },
    ).then((code) => ({ code, lines: memory.lines, text: memory.lines.join("\n") }));
  }

  async function read(rel: string): Promise<string> {
    return readFile(join(repo, rel), "utf8");
  }

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "bht-update-"));
    repo = join(tmp, "repo");
    target = join(tmp, "target");
    await makeInstalled(repo);
    await makeTarget(target);
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("replaces, adds and removes owned files, leaves the owner's files alone and bumps templateVersion", async () => {
    const { code, text } = await run();
    expect(code).toBe(0);

    expect(await read("apps/docs/src/app/page.tsx")).toBe("// template 0.2.0\n");
    expect(await read("apps/docs/src/app/new-feature.tsx")).toBe("// new in 0.2.0\n");
    expect(existsSync(join(repo, "apps/docs/src/app/legacy.tsx"))).toBe(false);
    expect(await read("package.json")).toContain('"version": "0.2.0"');

    // Never touched.
    expect(await read("registry/bobsburgers/scope.json")).toBe('{ "name": "Bobsburgers" }\n');
    expect(await read("registry/bobsburgers/atoms/thing/package.json")).toBe('{ "name": "@bobsburgers/atoms.thing" }\n');
    expect(existsSync(join(repo, "registry/example"))).toBe(false);
    expect(await read(".changeset/my-pending-change.md")).toContain("Mine.");
    expect(existsSync(join(repo, ".changeset/template-pending.md"))).toBe(false);
    expect(await read("pnpm-lock.yaml")).toBe("lockfileVersion: 9\n");

    // README: template part above the marker refreshed, owner's notes kept.
    expect(await read("README.md")).toBe(
      `# Component Registry (template 0.2.0 intro)\n\n${MARKER}\n\n## Our notes\n\nDeploy on Fridays.\n`,
    );

    // The owner's scope survives in the rewriteScope files.
    expect(await read("apps/docs/e2e/public.spec.ts")).toBe('await page.goto("/bobsburgers"); // 0.2.0\n');
    expect(await read("apps/docs/package.json")).toContain('"@bobsburgers/atoms.thing"');

    const config = JSON.parse(await read("registry.config.json")) as { scope: string; templateVersion: string };
    expect(config.scope).toBe("bobsburgers");
    expect(config.templateVersion).toBe("0.2.0");

    expect(text).toContain("Added (1):");
    expect(text).toContain("apps/docs/src/app/new-feature.tsx");
    expect(text).toContain("Removed (3):");
    expect(text).toContain("apps/docs/src/app/legacy.tsx");
    expect(text).toContain("Replaced (");
    expect(text).toContain("apps/docs/src/app/page.tsx");
    expect(text).toContain("Review with `git diff`, then run `pnpm install && pnpm verify`.");
  });

  it("removes stray template-only files and never copies the target's", async () => {
    const { code, text } = await run();
    expect(code).toBe(0);
    expect(existsSync(join(repo, "packages/create-bht-component-registry"))).toBe(false);
    expect(existsSync(join(repo, ".github/PULL_REQUEST_TEMPLATE.md"))).toBe(false);
    expect(existsSync(join(repo, ".github/ISSUE_TEMPLATE"))).toBe(false);
    expect(await read(".github/workflows/ci.yml")).toBe("name: CI 0.2.0\n");
    expect(text).toContain("Removed (3):");
    expect(text).toContain("packages/create-bht-component-registry/src/cli.ts");
    expect(text).toContain(".github/PULL_REQUEST_TEMPLATE.md");
    expect(text).not.toContain(".github/ISSUE_TEMPLATE/bug.yml");
  });

  it("--dry-run reports stray template-only files without removing them", async () => {
    const { code, text } = await run({ dryRun: true });
    expect(code).toBe(0);
    expect(text).toContain("packages/create-bht-component-registry/src/cli.ts");
    expect(text).toContain(".github/PULL_REQUEST_TEMPLATE.md");
    expect(await read("packages/create-bht-component-registry/src/cli.ts")).toBe("// old CLI copy\n");
    expect(await read(".github/PULL_REQUEST_TEMPLATE.md")).toBe("# template repo PR checklist\n");
  });

  it("reports a rewriteScope file as unchanged when only the scope name differed", async () => {
    await write(target, "apps/docs/package.json", '{ "dependencies": { "@example/atoms.thing": "workspace:*" } }\n');
    const { lines } = await run();
    const replaced = lines.filter((line) => line.trim() === "apps/docs/package.json");
    expect(replaced).toEqual([]);
  });

  it("refuses a dirty tree and changes nothing", async () => {
    const { code, text } = await run({}, false);
    expect(code).toBe(1);
    expect(text).toContain("Commit or stash your changes first; update replaces template-owned files and you'll want a clean diff.");
    expect(await read("apps/docs/src/app/page.tsx")).toBe("// template 0.1.0, locally edited by the owner\n");
    expect(await read("registry.config.json")).toBe(config("bobsburgers", "0.1.0"));
  });

  it("--dry-run prints the plan and changes nothing", async () => {
    const { code, text } = await run({ dryRun: true });
    expect(code).toBe(0);
    expect(text).toContain("[dry run]");
    expect(text).toContain("apps/docs/src/app/new-feature.tsx");
    expect(text).toContain("Dry run: nothing was changed.");
    expect(existsSync(join(repo, "apps/docs/src/app/new-feature.tsx"))).toBe(false);
    expect(existsSync(join(repo, "apps/docs/src/app/legacy.tsx"))).toBe(true);
    expect(await read("registry.config.json")).toBe(config("bobsburgers", "0.1.0"));
  });

  it("does nothing when the local template is already at or past the target", async () => {
    await write(repo, "registry.config.json", config("bobsburgers", "0.2.0"));
    const { code, text } = await run();
    expect(code).toBe(0);
    expect(text).toContain("Already at template 0.2.0 (target 0.2.0); nothing to do.");
    expect(await read("apps/docs/src/app/page.tsx")).toBe("// template 0.1.0, locally edited by the owner\n");
  });

  it("--to overrides the version a --from checkout claims", async () => {
    const { code } = await run({ to: "0.3.0" });
    expect(code).toBe(0);
    const config = JSON.parse(await read("registry.config.json")) as { templateVersion: string };
    expect(config.templateVersion).toBe("0.3.0");
  });

  it("leaves a README without the marker untouched and says so", async () => {
    await write(repo, "README.md", "# Entirely my own README\n");
    const { code, text } = await run();
    expect(code).toBe(0);
    expect(await read("README.md")).toBe("# Entirely my own README\n");
    expect(text).toContain("README.md has no");
    expect(text).toContain("left untouched");
  });

  it("works from a subdirectory of the registry", async () => {
    const { code } = await run({}, true, join(repo, "registry/bobsburgers"));
    expect(code).toBe(0);
    expect(await read("apps/docs/src/app/page.tsx")).toBe("// template 0.2.0\n");
  });

  it("fails clearly outside a registry", async () => {
    const elsewhere = join(tmp, "elsewhere");
    await mkdir(elsewhere);
    const { code, text } = await run({}, true, elsewhere);
    expect(code).toBe(1);
    expect(text).toContain("No registry.config.json found");
  });

  it("fetches through the injected fetcher when --from is not given and cleans up after", async () => {
    let cleaned = false;
    const fetchTemplate: TemplateFetcher = async (request) => {
      expect(request.version).toBe("0.2.0");
      return {
        dir: target,
        source: "stub",
        cleanup: async () => {
          cleaned = true;
        },
      };
    };
    const memory = createMemoryLogger();
    const code = await update(
      { to: "0.2.0", dryRun: false, yes: true },
      { cwd: repo, log: memory.log, prompt: neverPrompt, isTreeClean: async () => true, fetchTemplate },
    );
    expect(code).toBe(0);
    expect(cleaned).toBe(true);
    expect(await read("apps/docs/src/app/page.tsx")).toBe("// template 0.2.0\n");
  });

  it("skips the download entirely when the target is not newer", async () => {
    let fetched = false;
    const fetchTemplate: TemplateFetcher = async () => {
      fetched = true;
      return { dir: target, source: "stub", cleanup: async () => undefined };
    };
    const memory = createMemoryLogger();
    const code = await update(
      { to: "0.1.0", dryRun: false, yes: true },
      { cwd: repo, log: memory.log, prompt: neverPrompt, isTreeClean: async () => true, fetchTemplate },
    );
    expect(code).toBe(0);
    expect(fetched).toBe(false);
  });

  it("asks before applying unless --yes, and a 'no' changes nothing", async () => {
    const prompt: Prompter = { ...neverPrompt, confirm: async () => false };
    const memory = createMemoryLogger();
    const code = await update(
      { from: target, dryRun: false, yes: false },
      { cwd: repo, log: memory.log, prompt, isTreeClean: async () => true },
    );
    expect(code).toBe(1);
    expect(memory.lines.join("\n")).toContain("Cancelled");
    expect(await read("apps/docs/src/app/page.tsx")).toBe("// template 0.1.0, locally edited by the owner\n");
  });
});
