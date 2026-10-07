import { describe, expect, it } from "vitest";
import { markPublishable, rewritePackageRefs, rewriteScopeMentions, scopeRename } from "./rename.js";

describe("markPublishable", () => {
  it("flips private:true in place", () => {
    const out = markPublishable('{\n  "name": "@a/b",\n  "private": true,\n  "version": "1.0.0"\n}\n');
    expect(out).toBe('{\n  "name": "@a/b",\n  "private": false,\n  "version": "1.0.0"\n}\n');
  });

  it("adds private:false after version when the key is missing", () => {
    const out = JSON.parse(markPublishable('{"name":"@a/b","version":"1.0.0","files":[]}')) as Record<string, unknown>;
    expect(Object.keys(out)).toEqual(["name", "version", "private", "files"]);
  });

  it("returns the text untouched when already publishable", () => {
    const text = '{\n  "name": "@a/b",\n  "private": false\n}\n';
    expect(markPublishable(text)).toBe(text);
  });
});

describe("rewritePackageRefs", () => {
  const r = scopeRename("bobsburgers");

  it("renames package names and registry paths only", () => {
    const text = [
      'import { Thing } from "@example/atoms.thing";',
      '"directory": "registry/example/atoms/thing"',
      "An example of an example at https://example.com — untouched.",
      "registry/examples/other — a different folder, untouched.",
    ].join("\n");
    expect(rewritePackageRefs(text, r)).toBe(
      [
        'import { Thing } from "@bobsburgers/atoms.thing";',
        '"directory": "registry/bobsburgers/atoms/thing"',
        "An example of an example at https://example.com — untouched.",
        "registry/examples/other — a different folder, untouched.",
      ].join("\n"),
    );
  });

  it("is a no-op when the scope does not change", () => {
    const text = "@example/atoms.thing registry/example";
    expect(rewritePackageRefs(text, scopeRename("example"))).toBe(text);
  });
});

describe("rewriteScopeMentions", () => {
  const spec = [
    "// The example scope (registry/example) ships with the template.",
    'await page.goto("/example");',
    "await expect(page).toHaveTitle(/Example Component Registry/);",
    'await expect(page.getByRole("heading", { name: "Example" })).toBeVisible();',
    'await expect(page.getByText("pnpm add @example/atoms.thing")).toBeVisible();',
    "await page.keyboard.type('const Example = () => <Thing />; render(<Example />);');",
    '"@example/atoms.thing": "workspace:*",',
  ].join("\n");

  it("replaces the slug and the display name everywhere they stand alone", () => {
    const out = rewriteScopeMentions(spec, scopeRename("bobsburgers"));
    expect(out).toContain("The bobsburgers scope (registry/bobsburgers)");
    expect(out).toContain('page.goto("/bobsburgers")');
    expect(out).toContain("/Bobsburgers Component Registry/");
    expect(out).toContain('{ name: "Bobsburgers" }');
    expect(out).toContain("pnpm add @bobsburgers/atoms.thing");
    expect(out).toContain('"@bobsburgers/atoms.thing": "workspace:*"');
    expect(out).not.toMatch(/[^A-Za-z]example[^A-Za-z]/);
  });

  it("keeps an `Example` that is a JS identifier, so multi-word names stay valid code", () => {
    const out = rewriteScopeMentions(spec, scopeRename("acme-corp"));
    expect(out).toContain("/Acme Corp Component Registry/");
    expect(out).toContain('{ name: "Acme Corp" }');
    expect(out).toContain("const Example = () => <Thing />; render(<Example />);");
    expect(out).toContain('page.goto("/acme-corp")');
  });

  it("does not touch words that merely contain the slug", () => {
    const out = rewriteScopeMentions("examples example-ish counterexample example.com", scopeRename("acme"));
    expect(out).toBe("examples example-ish counterexample acme.com");
  });
});
