// @vitest-environment node
import { describe, expect, it } from "vitest";
import { thumbnailProgram, toCardModel } from "./card-model";
import type { CatalogComponent } from "./types";

const base: CatalogComponent = {
  scope: "example",
  category: "atoms",
  name: "price-tag",
  packageName: "@example/atoms.price-tag",
  version: "0.0.0",
  title: "Price Tag",
  summary: "From the README.",
  readme: "",
  status: "STABLE",
  tags: [],
  design: [],
  thumbnail: true,
  docs: [],
  functions: [],
  examples: [
    {
      name: "BasicPriceTag",
      title: "Basic Price Tag",
      description: "",
      code: "render(<PriceTag amount={1} />);",
    },
  ],
  files: [],
  releases: [],
  exportNames: ["PriceTag"],
  hasStyles: true,
  publishRegistry: "https://registry.npmjs.org",
  visibility: "public",
  sourcePath: "registry/example/atoms/price-tag",
  dependencies: [],
  versions: [],
};

describe("toCardModel", () => {
  it("uses the first example as the tile's thumbnail program", () => {
    expect(thumbnailProgram(base)).toContain("PriceTag");
  });

  it("carries the thumbnail markup rendered for the package", () => {
    const html = { "@example/atoms.price-tag": "<span>$1</span>" };
    expect(toCardModel(base, html).thumbnailHtml).toBe("<span>$1</span>");
  });

  it("has no thumbnail markup when none was rendered", () => {
    const model = toCardModel(base, {});
    expect(model.thumbnailHtml).toBeNull();
    expect(model.thumbnailKind).toBe("none");
  });

  it("calls a tile that rendered rendered, and an overlay an overlay", () => {
    const html = { "@example/atoms.price-tag": "<span />" };
    expect(toCardModel(base, html).thumbnailKind).toBe("rendered");
    const modal = { ...base, exportNames: ["Modal"] };
    expect(toCardModel(modal, {}).thumbnailKind).toBe("overlay");
  });

  it("never thumbnails a component that renders through a portal", () => {
    const modal = { ...base, name: "modal", exportNames: ["Modal"] };
    expect(thumbnailProgram(modal)).toBeNull();
  });

  it("lets a package opt out of its tile with registry.preview.thumbnail: false", () => {
    const popup = {
      ...base,
      name: "popup",
      exportNames: ["Popup"],
      thumbnail: false,
    };
    expect(thumbnailProgram(popup)).toBeNull();
  });

  it("carries the package's own status and tags", () => {
    const beta = {
      ...base,
      status: "BETA" as const,
      tags: ["commerce", "pricing"],
    };
    expect(toCardModel(beta, {})).toMatchObject({
      title: "Price Tag",
      summary: "From the README.",
      tags: ["commerce", "pricing"],
      status: "BETA",
    });
  });
});
