import { describe, expect, it } from "vitest";
import {
  DEFAULT_MANIFEST,
  DEFAULT_README_MARKER,
  globToRegExp,
  isTemplateOnly,
  isTemplateOwned,
  mergeReadme,
  parseManifest,
  splitReadme,
} from "./manifest.js";

describe("globToRegExp", () => {
  it("lets ** cross directories and keeps * within one segment", () => {
    expect(globToRegExp("apps/docs/**").test("apps/docs/src/app/page.tsx")).toBe(true);
    expect(globToRegExp("apps/docs/**").test("apps/docs-site/page.tsx")).toBe(false);
    expect(globToRegExp(".changeset/*.md").test(".changeset/fuzzy-cats.md")).toBe(true);
    expect(globToRegExp(".changeset/*.md").test(".changeset/nested/fuzzy-cats.md")).toBe(false);
    expect(globToRegExp(".changeset/*.md").test(".changeset/config.json")).toBe(false);
  });

  it("matches a bare filename at the root only", () => {
    expect(globToRegExp("package.json").test("package.json")).toBe(true);
    expect(globToRegExp("package.json").test("apps/docs/package.json")).toBe(false);
  });

  it("treats dots as literal characters", () => {
    expect(globToRegExp("turbo.json").test("turboXjson")).toBe(false);
  });

  it("lets **/ match zero directories", () => {
    expect(globToRegExp("registry/**/docs.json").test("registry/docs.json")).toBe(true);
    expect(globToRegExp("registry/**/docs.json").test("registry/acme/atoms/thing/docs.json")).toBe(true);
  });
});

describe("isTemplateOwned", () => {
  it("owns the docs app and the shared packages", () => {
    expect(isTemplateOwned("apps/docs/src/app/page.tsx", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOwned("packages/scope/src/index.ts", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOwned("scripts/gen.mts", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOwned("scripts/templates/component/package.json.hbs", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOwned(".changeset/config.json", DEFAULT_MANIFEST)).toBe(true);
  });

  it("still owns the files pre-release (Turborepo) templates shipped, so update can remove them", () => {
    expect(isTemplateOwned("turbo.json", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOwned("turbo/generators/config.ts", DEFAULT_MANIFEST)).toBe(true);
  });

  it("never owns the owner's components, config, changesets or README", () => {
    expect(isTemplateOwned("registry/acme/atoms/thing/package.json", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOwned("registry.config.json", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOwned(".changeset/fuzzy-cats.md", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOwned("README.md", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOwned("pnpm-lock.yaml", DEFAULT_MANIFEST)).toBe(false);
  });

  it("checks `templateOnly` before `owned`, so the CLI's own source is never owned", () => {
    expect(isTemplateOnly("packages/create-bht-component-registry/src/cli.ts", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOwned("packages/create-bht-component-registry/src/cli.ts", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOnly(".github/ISSUE_TEMPLATE/bug.yml", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOnly(".github/PULL_REQUEST_TEMPLATE.md", DEFAULT_MANIFEST)).toBe(true);
    // A directory path with a trailing slash matches its own `/**` glob (the copy filter relies on this).
    expect(isTemplateOnly("packages/create-bht-component-registry/", DEFAULT_MANIFEST)).toBe(true);
    expect(isTemplateOnly("packages/", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOnly(".github/workflows/ci.yml", DEFAULT_MANIFEST)).toBe(false);
    expect(isTemplateOwned(".github/workflows/ci.yml", DEFAULT_MANIFEST)).toBe(true);
  });

  it("lets `never` win over an `owned` glob that also matches", () => {
    expect(isTemplateOwned("apps/docs/src/generated/catalog.ts", DEFAULT_MANIFEST)).toBe(false);
    const manifest = { ...DEFAULT_MANIFEST, owned: ["**"], never: ["registry/**"] };
    expect(isTemplateOwned("registry/acme/scope.json", manifest)).toBe(false);
    expect(isTemplateOwned("anything/else.ts", manifest)).toBe(true);
  });
});

describe("parseManifest", () => {
  it("fills defaults for optional fields", () => {
    const manifest = parseManifest(JSON.stringify({ owned: ["apps/**"] }));
    expect(manifest.never).toEqual([]);
    expect(manifest.templateOnly).toEqual([]);
    expect(manifest.rewriteScope).toEqual([]);
    expect(manifest.readmeMarker).toBe(DEFAULT_README_MARKER);
  });

  it("rejects a manifest without an owned list or with a non-string entry", () => {
    expect(() => parseManifest("{}")).toThrow(/"owned" must be an array of strings/);
    expect(() => parseManifest(JSON.stringify({ owned: ["a", 1] }))).toThrow(/"owned"/);
    expect(() => parseManifest("not json")).toThrow(/not valid JSON/);
  });
});

describe("README marker merge", () => {
  const marker = DEFAULT_README_MARKER;
  const local = `# Acme Registry (old template text)\n\nOld intro.\n\n${marker}\n\n## Our notes\n\nDeploy on Fridays.\n`;
  const target = `# Component Registry (new template text)\n\nNew intro.\n\n${marker}\n\n## Your notes\n\nReplace me.\n`;

  it("splits at the marker, keeping the marker with the owner's part", () => {
    const parts = splitReadme(local, marker);
    expect(parts?.above).toBe("# Acme Registry (old template text)\n\nOld intro.\n\n");
    expect(parts?.below.startsWith(marker)).toBe(true);
    expect(parts?.below).toContain("Deploy on Fridays.");
  });

  it("takes the target's top and the owner's bottom", () => {
    const merged = mergeReadme(local, target, marker);
    expect(merged).toBe(`# Component Registry (new template text)\n\nNew intro.\n\n${marker}\n\n## Our notes\n\nDeploy on Fridays.\n`);
  });

  it("returns null when the local README has no marker", () => {
    expect(splitReadme("# No marker here\n", marker)).toBeNull();
    expect(mergeReadme("# No marker here\n", target, marker)).toBeNull();
  });

  it("keeps the owner's marker when the target dropped it", () => {
    const merged = mergeReadme(local, "# Brand new\n\nText.\n", marker);
    expect(merged).toBe(`# Brand new\n\nText.\n\n${marker}\n\n## Our notes\n\nDeploy on Fridays.\n`);
  });
});
