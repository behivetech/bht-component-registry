// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveDocLink } from "./doc-links";

describe("resolveDocLink", () => {
  it("resolves a sibling page against the linking page's folder", () => {
    expect(resolveDocLink("guide/components", "generators.md")).toBe(
      "/docs/guide/generators",
    );
    expect(resolveDocLink("contributing", "standards.md")).toBe(
      "/docs/standards",
    );
  });

  it("walks .. and . segments", () => {
    expect(resolveDocLink("guide/components", "../contributing.md")).toBe(
      "/docs/contributing",
    );
    expect(resolveDocLink("guide/components", "./scopes.md")).toBe(
      "/docs/guide/scopes",
    );
    expect(resolveDocLink("contributing", "guide/publishing.md")).toBe(
      "/docs/guide/publishing",
    );
  });

  it("does not climb above the docs root", () => {
    expect(resolveDocLink("contributing", "../../README.md")).toBe(
      "/docs/README",
    );
  });

  it("keeps the fragment", () => {
    expect(resolveDocLink("guide/components", "../contributing.md#rules")).toBe(
      "/docs/contributing#rules",
    );
    expect(resolveDocLink("guide/components", "publishing.md#")).toBe(
      "/docs/guide/publishing#",
    );
  });

  it("is case-insensitive about the extension", () => {
    expect(resolveDocLink("guide/components", "FAQ.MD")).toBe(
      "/docs/guide/FAQ",
    );
  });

  it("leaves anything that is not a relative .md link alone", () => {
    expect(
      resolveDocLink("guide/components", "https://example.test/page.md"),
    ).toBeNull();
    expect(
      resolveDocLink("guide/components", "mailto:someone@example.test"),
    ).toBeNull();
    expect(resolveDocLink("guide/components", "/tokens")).toBeNull();
    expect(resolveDocLink("guide/components", "#props")).toBeNull();
    expect(resolveDocLink("guide/components", "generators")).toBeNull();
    expect(resolveDocLink("guide/components", "generators.md?x=1")).toBeNull();
    expect(resolveDocLink("guide/components", "diagram.png")).toBeNull();
  });
});
