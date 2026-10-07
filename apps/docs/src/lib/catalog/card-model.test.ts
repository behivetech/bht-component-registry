// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toCardModel } from "./card-model";
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
  docs: [],
  examples: [{ name: "BasicPriceTag", title: "Basic Price Tag", description: "", code: "render(<PriceTag amount={1} />);" }],
  files: [],
  releases: [],
  exportNames: ["PriceTag"],
  hasStyles: true,
  sourcePath: "registry/example/atoms/price-tag",
  dependencies: [],
};

describe("toCardModel", () => {
  it("uses the first composition as the tile's live thumbnail", () => {
    expect(toCardModel(base).thumbnailCode).toContain("PriceTag");
  });

  it("never thumbnails a component that renders through a portal", () => {
    const modal = { ...base, name: "modal", exportNames: ["Modal"] };
    expect(toCardModel(modal).thumbnailCode).toBeNull();
  });

  it("carries the package's own status and tags", () => {
    const beta = { ...base, status: "BETA" as const, tags: ["commerce", "pricing"] };
    expect(toCardModel(beta)).toMatchObject({ title: "Price Tag", summary: "From the README.", tags: ["commerce", "pricing"], status: "BETA" });
  });
});
