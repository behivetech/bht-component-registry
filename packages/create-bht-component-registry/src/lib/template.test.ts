import { describe, expect, it } from "vitest";
import { mainTarballUrl, tagTarballUrl, templateTag, TEMPLATE_PACKAGE } from "./template.js";

describe("template release tags", () => {
  it("uses the tag `changeset publish` creates for the CLI package", () => {
    expect(templateTag("0.2.0")).toBe(`${TEMPLATE_PACKAGE}@0.2.0`);
    expect(templateTag("0.2.0")).toBe("create-bht-component-registry@0.2.0");
  });

  it("downloads that tag's tarball from GitHub, with the @ encoded", () => {
    expect(tagTarballUrl("0.2.0")).toBe(
      "https://github.com/behivetech/bht-component-registry/archive/refs/tags/create-bht-component-registry%400.2.0.tar.gz",
    );
    expect(mainTarballUrl()).toBe("https://github.com/behivetech/bht-component-registry/archive/refs/heads/main.tar.gz");
  });
});
