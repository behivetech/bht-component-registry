// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fontProblems, fontsModule, resolveAsset, resolveHero } from "./branding";

const files = new Set(["branding/logo.svg", "branding/fonts/body-400.woff2"]);
const exists = (p: string) => files.has(p);

describe("resolveAsset", () => {
  it("serves a branding/ file from /branding and checks it exists", () => {
    expect(resolveAsset("site.logo", "logo.svg", exists)).toEqual({
      url: "/branding/logo.svg",
      source: "branding",
      warning: null,
    });
    expect(resolveAsset("site.logo", "./logo.svg", exists)?.url).toBe("/branding/logo.svg");
    expect(resolveAsset("site.favicon", "mark.svg", exists)?.warning).toMatch(/branding\/mark\.svg/);
  });

  it("keeps the legacy public/ path with a warning, and external URLs as is", () => {
    const legacy = resolveAsset("site.logo", "/logo.svg", exists);
    expect(legacy).toMatchObject({ url: "/logo.svg", source: "public" });
    expect(legacy?.warning).toMatch(/update/);
    expect(resolveAsset("site.logo", "https://cdn.example/logo.svg", exists)).toMatchObject({
      source: "external",
      warning: null,
    });
    expect(resolveAsset("site.logo", "", exists)).toBeNull();
    expect(resolveAsset("site.logo", undefined, exists)).toBeNull();
  });
});

describe("fonts", () => {
  it("re-exports Inter when nothing is configured", () => {
    const source = fontsModule(undefined);
    expect(source).toContain('import { inter } from "@/app/fonts"');
    expect(source).not.toContain("next/font/local");
    expect(source).toContain("export const fontClassName = [inter.variable].join");
  });

  it("writes a next/font/local call per configured slot with literal paths", () => {
    const source = fontsModule({
      body: { family: "Ubuntu", files: [{ path: "fonts/body-400.woff2", weight: "400" }] },
    });
    expect(source).toContain('import localFont from "next/font/local"');
    expect(source).toContain('path: "../../public/branding/fonts/body-400.woff2", weight: "400"');
    expect(source).toContain('variable: "--site-body-face"');
    // The export is named after the family: next/font names the face and the variable's value after it.
    expect(source).toContain("export const Ubuntu = localFont(");
    expect(source).toContain("[inter.variable, Ubuntu.variable]");
    expect(source).not.toContain("--site-heading-face");
  });

  it("reports missing files and bad paths before next/font does", () => {
    expect(fontProblems({ body: { family: "X", files: [{ path: "fonts/body-400.woff2" }] } }, exists)).toEqual([]);
    const problems = fontProblems(
      {
        body: { family: "", files: [] },
        heading: { family: "Y", files: [{ path: "/abs.woff2" }, { path: "fonts/nope.woff2" }] },
      },
      exists,
    );
    expect(problems).toHaveLength(4);
    expect(problems.join("\n")).toMatch(/does not exist/);
  });
});

describe("resolveHero", () => {
  const site = { title: "Acme", description: "Parts." };
  it("defaults to browse + docs", () => {
    expect(resolveHero(undefined, site, { primaryScope: "acme", hasDocs: true })).toEqual({
      headline: "Acme",
      subtext: "Parts.",
      actions: [
        { label: "Browse components", href: "/acme", variant: "primary" },
        { label: "Docs", href: "/docs", variant: "secondary" },
      ],
    });
    expect(resolveHero(undefined, site, { primaryScope: "acme", hasDocs: false }).actions).toHaveLength(1);
  });

  it("lets config replace the actions and the copy", () => {
    const hero = resolveHero(
      { headline: "Hi", actions: [{ label: "Go", href: "/x" }, { label: " ", href: "/y" }] },
      site,
      { primaryScope: "acme", hasDocs: true },
    );
    expect(hero.headline).toBe("Hi");
    expect(hero.subtext).toBe("Parts.");
    expect(hero.actions).toEqual([{ label: "Go", href: "/x", variant: "primary" }]);
  });
});
