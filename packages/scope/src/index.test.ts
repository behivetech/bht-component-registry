import { describe, expect, it } from "vitest";
import { describeSlugProblem, isValidScope, packageNameFor, slugProblem, slugify, titleCase } from "./index";

describe("slugProblem", () => {
  it("accepts ordinary scopes", () => {
    for (const slug of ["acme", "bobsburgers", "bobs-burgers", "a1", "x", "team-42"]) {
      expect(slugProblem(slug)).toBeNull();
    }
  });

  it("rejects empty, malformed and reserved names", () => {
    expect(slugProblem("")).toBe("empty");
    expect(slugProblem("Bad Scope")).toBe("format");
    expect(slugProblem("-acme")).toBe("format");
    expect(slugProblem("acme-")).toBe("format");
    expect(slugProblem("@acme")).toBe("format");
    expect(slugProblem("a".repeat(41))).toBe("format");
    expect(slugProblem("dashboard")).toBe("reserved");
    expect(slugProblem("example")).toBe("reserved");
  });

  it("explains each problem in a sentence", () => {
    expect(describeSlugProblem("", "empty")).toMatch(/required/);
    expect(describeSlugProblem("Bad Scope", "format")).toMatch(/not a valid scope/);
    expect(describeSlugProblem("docs", "reserved")).toMatch(/reserved/);
  });

  it("isValidScope mirrors slugProblem", () => {
    expect(isValidScope("acme")).toBe(true);
    expect(isValidScope("docs")).toBe(false);
  });
});

describe("slugify", () => {
  it("lowercases, hyphenates and strips accents", () => {
    expect(slugify("Bob's Burgers")).toBe("bob-s-burgers");
    expect(slugify("  Café Ünïcode ")).toBe("cafe-unicode");
    expect(slugify("---")).toBe("");
  });

  it("caps at 40 characters without a trailing hyphen", () => {
    const long = slugify("a".repeat(39) + "-b");
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("-")).toBe(false);
  });
});

describe("naming helpers", () => {
  it("titleCase and packageNameFor", () => {
    expect(titleCase("bobs-burgers")).toBe("Bobs Burgers");
    expect(packageNameFor("acme", "atoms", "price-tag")).toBe("@acme/atoms.price-tag");
  });
});
