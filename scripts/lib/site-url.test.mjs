import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { docsUrl, siteUrl } from "./site-url.mjs";

const config = { site: { url: "https://platform.example.test" } };

describe("siteUrl", () => {
  it("uses the config value when the variable is unset", () => {
    assert.equal(siteUrl({ env: {}, config }), "https://platform.example.test");
  });

  it("lets BHT_DOCS_SITE_URL override the config", () => {
    const env = { BHT_DOCS_SITE_URL: "https://docs.other.test" };
    assert.equal(siteUrl({ env, config }), "https://docs.other.test");
  });

  it("trims the value and treats a blank one as unset", () => {
    assert.equal(
      siteUrl({ env: { BHT_DOCS_SITE_URL: "  https://docs.other.test  " }, config }),
      "https://docs.other.test",
    );
    assert.equal(
      siteUrl({ env: { BHT_DOCS_SITE_URL: "   " }, config }),
      "https://platform.example.test",
    );
    assert.equal(
      siteUrl({ env: { BHT_DOCS_SITE_URL: "" }, config }),
      "https://platform.example.test",
    );
  });

  it("strips trailing slashes from either source", () => {
    assert.equal(
      siteUrl({ env: { BHT_DOCS_SITE_URL: "https://docs.other.test///" }, config }),
      "https://docs.other.test",
    );
    assert.equal(
      siteUrl({ env: {}, config: { site: { url: "https://a.test/" } } }),
      "https://a.test",
    );
  });

  it("keeps a base path", () => {
    assert.equal(
      siteUrl({ env: { BHT_DOCS_SITE_URL: "https://a.test/docs/" }, config }),
      "https://a.test/docs",
    );
  });

  it("returns null when neither source is set", () => {
    assert.equal(siteUrl({ env: {}, config: { site: {} } }), null);
    assert.equal(siteUrl({ env: {}, config: {} }), null);
  });

  it("reads the repo's registry.config.json by default", () => {
    const file = join(import.meta.dirname, "..", "..", "registry.config.json");
    const expected = JSON.parse(readFileSync(file, "utf8")).site?.url ?? null;
    assert.equal(siteUrl({ env: {} }), expected?.replace(/\/+$/, "") ?? null);
  });

  for (const [label, value] of [
    ["a plain word", "docs"],
    ["a relative path", "/docs"],
    ["http", "http://docs.other.test"],
    ["another scheme", "ftp://docs.other.test"],
    ["credentials", "https://user:pw@docs.other.test"],
    ["a query", "https://docs.other.test/?a=1"],
    ["a fragment", "https://docs.other.test/#top"],
  ]) {
    it(`fails loudly, naming the variable, for ${label}`, () => {
      assert.throws(
        () => siteUrl({ env: { BHT_DOCS_SITE_URL: value }, config }),
        /BHT_DOCS_SITE_URL must be an absolute https:\/\//,
      );
    });
  }

  it("does not fall back to the config when the variable is invalid", () => {
    assert.throws(() => siteUrl({ env: { BHT_DOCS_SITE_URL: "nope" }, config }));
  });
});

describe("docsUrl", () => {
  it("is the site URL plus the package path", () => {
    assert.equal(
      docsUrl("behivetech/atoms/button", { env: {}, config }),
      "https://platform.example.test/behivetech/atoms/button",
    );
  });

  it("uses BHT_DOCS_SITE_URL, with no doubled slash", () => {
    const env = { BHT_DOCS_SITE_URL: "https://example.test/" };
    assert.equal(
      docsUrl("behivetech/atoms/button", { env, config }),
      "https://example.test/behivetech/atoms/button",
    );
  });

  it("is null without a site URL", () => {
    assert.equal(
      docsUrl("behivetech/atoms/button", { env: {}, config: {} }),
      null,
    );
  });

  it("is null for a package outside registry/", () => {
    assert.equal(docsUrl("../packages/env", { env: {}, config }), null);
  });

  it("throws on an invalid BHT_DOCS_SITE_URL", () => {
    assert.throws(
      () =>
        docsUrl("a/b/c", { env: { BHT_DOCS_SITE_URL: "http://x.test" }, config }),
      /BHT_DOCS_SITE_URL/,
    );
  });
});
