// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodeSandboxHash, encodeSandboxHash } from "./sandbox-protocol";

describe("sandbox hash", () => {
  it("round-trips a program, including non-ASCII source", () => {
    const program = {
      code: "render(<p>héllo — “quotes” → ✓</p>)",
      noInline: true,
    };
    expect(decodeSandboxHash(encodeSandboxHash(program))).toEqual(program);
  });

  it("is URL-safe: no +, / or = in the fragment", () => {
    const hash = encodeSandboxHash({
      code: "<Badge>?? >> ~~ ~~</Badge>".repeat(20),
      noInline: false,
    });
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("accepts the fragment with or without its leading #", () => {
    const hash = encodeSandboxHash({ code: "<p />", noInline: false });
    expect(decodeSandboxHash(`#${hash}`)).toEqual(decodeSandboxHash(hash));
  });

  it("drops the theme: it belongs to the page, not the program", () => {
    const decoded = decodeSandboxHash(
      encodeSandboxHash({ code: "<p />", noInline: false, theme: "dark" }),
    );
    expect(decoded).toEqual({ code: "<p />", noInline: false });
  });

  it("returns null for an empty fragment", () => {
    expect(decodeSandboxHash("")).toBeNull();
    expect(decodeSandboxHash("#")).toBeNull();
  });

  it("returns null for a fragment that is not base64url", () => {
    expect(decodeSandboxHash("#not base64!")).toBeNull();
  });

  it("returns null for valid base64 that is not a program", () => {
    const encode = (text: string) => btoa(text).replace(/=+$/, "");
    expect(decodeSandboxHash(encode("not json"))).toBeNull();
    expect(
      decodeSandboxHash(encode(JSON.stringify({ noInline: true }))),
    ).toBeNull();
    expect(decodeSandboxHash(encode(JSON.stringify({ code: 42 })))).toBeNull();
  });
});
