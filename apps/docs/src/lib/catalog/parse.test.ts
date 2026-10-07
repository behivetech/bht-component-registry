// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractTokens, humanizeTitle, parseChangelog, readmeSummary, readmeTitle, splitPascal, stripTitle, toTitle } from "./parse";

const README = `# Hero Banner

Full-width hero section with a headline, subtext and call to action.
Second line of the same paragraph.

## Usage

\`\`\`jsx
<HeroBanner headline="Hi" />
\`\`\`

Another paragraph that should not be the summary.
`;

describe("readme helpers", () => {
  it("reads the H1 as the title and strips it from the body", () => {
    expect(readmeTitle(README)).toBe("Hero Banner");
    expect(stripTitle(README).startsWith("Full-width")).toBe(true);
  });

  it("summarises with the first prose paragraph, joined onto one line", () => {
    expect(readmeSummary(README)).toBe(
      "Full-width hero section with a headline, subtext and call to action. Second line of the same paragraph.",
    );
  });

  it("skips code blocks, headings, lists and tables when summarising", () => {
    expect(readmeSummary("# T\n\n```jsx\nx\n```\n\n## H\n\n- item\n\n| a |\n\nReal text.")).toBe("Real text.");
  });

  it("title-cases slugs and splits PascalCase", () => {
    expect(toTitle("hero-banner")).toBe("Hero Banner");
    expect(splitPascal("IconOnlyButton")).toBe("Icon Only Button");
  });

  it("humanizes PascalCase README titles but leaves authored titles alone", () => {
    expect(humanizeTitle("PriceTag")).toBe("Price Tag");
    expect(humanizeTitle("Hero Banner")).toBe("Hero Banner");
    expect(humanizeTitle("Button")).toBe("Button");
    expect(humanizeTitle("getClassName")).toBe("getClassName");
  });
});

describe("parseChangelog", () => {
  it("returns one release per version heading, in file order", () => {
    const releases = parseChangelog(
      "# @behivetech/atoms.button\n\n## 0.4.0\n\n### Minor Changes\n\n- MD3 restyle\n\n## 0.3.0\n\n- first\n",
    );
    expect(releases.map((r) => r.version)).toEqual(["0.4.0", "0.3.0"]);
    expect(releases[0]?.notes).toContain("MD3 restyle");
  });

  it("yields nothing for a changelog with only the package heading", () => {
    expect(parseChangelog("# @example/atoms.price-tag\n")).toEqual([]);
  });
});

describe("extractTokens", () => {
  const scss = `
:root {
  --md-sys-color-primary: #64558f;
  --md-sys-typescale-body-large-size: 1rem;
  --md-sys-typescale-body-large-line-height: 1.5rem;
  --md-sys-typescale-body-large-weight: 400;
  --md-sys-shape-corner-full: 9999px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --md-sys-color-primary: #cebdfe; }
}
:root[data-theme="dark"] {
  --md-sys-color-primary: #cebdfe;
}
`;

  it("pairs light and dark values per color role", () => {
    const tokens = extractTokens(scss);
    expect(tokens.colorRoles).toEqual([{ role: "primary", light: "#64558f", dark: "#cebdfe" }]);
  });

  it("groups typescale properties by style name", () => {
    expect(extractTokens(scss).typescale).toEqual([
      { name: "body-large", size: "1rem", lineHeight: "1.5rem", weight: "400" },
    ]);
  });

  it("lists shape corners", () => {
    expect(extractTokens(scss).shapes).toEqual([{ name: "full", value: "9999px" }]);
  });
});
