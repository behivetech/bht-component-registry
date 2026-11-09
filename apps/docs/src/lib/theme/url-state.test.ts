// @vitest-environment node
import { describe, expect, it } from "vitest";
import { configSnippet, parseTheme, serializeTheme } from "./url-state";

describe("theme url state", () => {
  it("round-trips seeds, options and overrides", () => {
    const seeds = {
      primary: "#2c1760",
      secondary: "#43b505",
      tertiary: null,
      neutral: "#333333",
      scheme: "vibrant" as const,
      contrast: "high" as const,
      overrides: { light: { primary: "#112233" }, dark: { onPrimary: "#ffffff" } },
    };
    const fragment = serializeTheme(seeds);
    expect(fragment).toBe(
      "p=2c1760&s=43b505&n=333333&v=vibrant&c=high&ol=primary%3A112233&od=onPrimary%3Affffff",
    );
    expect(parseTheme(`#${fragment}`)).toEqual(seeds);
  });

  it("drops defaults and ignores junk", () => {
    expect(serializeTheme({ primary: "#6750a4", scheme: "tonalspot", contrast: "standard" })).toBe("p=6750a4");
    expect(parseTheme("#p=6750a4&v=nope&c=weird&ol=bogus:112233,primary:zzz")).toEqual({
      primary: "#6750a4",
      secondary: null,
      tertiary: null,
      neutral: null,
      scheme: "tonalspot",
      contrast: "standard",
      overrides: null,
    });
    expect(parseTheme("#p=6750a4&c=constructor")!.contrast).toBe("standard");
    expect(parseTheme("#s=43b505")).toBeNull();
    expect(parseTheme("")).toBeNull();
  });

  it("writes a site.theme snippet with only what differs from the defaults", () => {
    expect(configSnippet({ primary: "#6750a4" })).toBe('  "theme": {\n    "primary": "#6750a4"\n  }');
    const full = configSnippet({
      primary: "#2c1760",
      secondary: "#43b505",
      scheme: "fidelity",
      overrides: { light: { primary: "#112233" }, dark: {} },
    });
    expect(full).toContain('"scheme": "fidelity"');
    expect(full).toContain('"overrides"');
    expect(full).not.toContain('"dark"');
  });
});
