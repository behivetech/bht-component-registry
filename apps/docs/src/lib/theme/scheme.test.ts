// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ROLES,
  applyOverrides,
  buildScheme,
  contrastRatio,
  contrastReport,
  normalizeHex,
  roleToken,
  themeCss,
} from "./scheme";

describe("buildScheme", () => {
  it("emits every role for both schemes as lowercase hex", () => {
    const theme = buildScheme({ primary: "#6750a4" });
    for (const scheme of [theme.light, theme.dark]) {
      for (const role of ROLES) expect(scheme[role]).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(theme.light.surface).not.toBe(theme.dark.surface);
  });

  it("gives a very dark seed a legible primary in both schemes", () => {
    const theme = buildScheme({ primary: "#2c1760" });
    expect(contrastRatio(theme.light.onPrimary, theme.light.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.dark.onPrimary, theme.dark.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.light.primary, theme.light.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a pinned secondary's hue instead of MD3's muted derivation", () => {
    const derived = buildScheme({ primary: "#2c1760" });
    const pinned = buildScheme({ primary: "#2c1760", secondary: "#43b505" });
    expect(pinned.light.secondary).not.toBe(derived.light.secondary);
    // Green: more green than red or blue.
    const n = parseInt(pinned.light.secondary.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("rejects a seed that is not #rrggbb", () => {
    expect(() => buildScheme({ primary: "purple" })).toThrow(/primary/);
    expect(() => buildScheme({ primary: "#6750a4", tertiary: "#fff" })).toThrow(/tertiary/);
  });

  it("is deterministic", () => {
    expect(buildScheme({ primary: "#43b505", scheme: "vibrant" })).toEqual(
      buildScheme({ primary: "#43b505", scheme: "vibrant" }),
    );
  });
});

describe("themeCss", () => {
  it("writes the three cascade blocks and the fixed dark header values", () => {
    const css = themeCss(buildScheme({ primary: "#6750a4" }), "test");
    expect(css).toContain(":root {");
    expect(css).toContain('@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {');
    expect(css).toContain(':root[data-theme="dark"] {');
    expect(css).toContain("--md-sys-color-on-primary-container:");
    expect(css).toContain("--site-dark-surface:");
    expect(css.startsWith("/* test */")).toBe(true);
  });

  it("applies overrides per scheme and ignores junk", () => {
    const theme = applyOverrides(buildScheme({ primary: "#6750a4" }), {
      light: { primary: "#112233", bogus: "#000000" } as never,
      dark: { primary: "nope" },
    });
    expect(theme.light.primary).toBe("#112233");
    expect(theme.dark.primary).toMatch(/^#[0-9a-f]{6}$/);
    expect(theme.dark.primary).not.toBe("nope");
  });
});

describe("helpers", () => {
  it("names tokens in kebab case", () => {
    expect(roleToken("onPrimaryContainer")).toBe("--md-sys-color-on-primary-container");
    expect(roleToken("surface")).toBe("--md-sys-color-surface");
  });

  it("normalises hex input", () => {
    expect(normalizeHex(" #ABC123 ")).toBe("#abc123");
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("abc123")).toBeNull();
  });

  it("reports the weakest pair first and flags below 4.5:1", () => {
    const theme = buildScheme({ primary: "#6750a4" });
    const report = contrastReport({ ...theme.light, onPrimary: theme.light.primary });
    expect(report[0]).toMatchObject({ text: "onPrimary", background: "primary", passes: false });
    expect(report.at(-1)!.ratio).toBeGreaterThanOrEqual(report[0]!.ratio);
  });
});
