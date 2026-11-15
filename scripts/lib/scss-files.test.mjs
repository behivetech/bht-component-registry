import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ALLOWED_USES, selectStylesheets } from "./scss-files.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROOT = "/repo";
const all = [
  "registry/acme/atoms/card/card.module.scss",
  "docs-history/acme/atoms/card/1.0.0/card.module.scss",
];
const select = (given) =>
  selectStylesheets({ root: ROOT, given, listAll: () => all });

describe("selectStylesheets", () => {
  it("checks every stylesheet when none is named, except the skipped tree", () => {
    assert.deepEqual(select([]), ["registry/acme/atoms/card/card.module.scss"]);
  });

  it("takes the absolute paths lint-staged passes", () => {
    assert.deepEqual(select(["/repo/apps/docs/src/a.module.scss"]), [
      "apps/docs/src/a.module.scss",
    ]);
  });

  it("takes paths relative to the repo root", () => {
    assert.deepEqual(select(["apps/docs/src/a.module.scss"]), [
      "apps/docs/src/a.module.scss",
    ]);
  });

  it("drops what is not a component stylesheet", () => {
    assert.deepEqual(
      select(["/repo/apps/docs/src/globals.scss", "/repo/README.md"]),
      [],
    );
  });

  it("drops a named file in the skipped tree", () => {
    assert.deepEqual(
      select(["/repo/docs-history/acme/atoms/card/1.0.0/card.module.scss"]),
      [],
    );
  });

  it("checks nothing, rather than everything, when the named files are all dropped", () => {
    assert.deepEqual(select(["/repo/README.md"]), []);
  });
});

describe("ALLOWED_USES", () => {
  it("names stylesheets that exist and still pull the file in", () => {
    for (const [file, targets] of Object.entries(ALLOWED_USES)) {
      assert.ok(existsSync(join(REPO, file)), `${file} does not exist`);

      const source = readFileSync(join(REPO, file), "utf8");

      for (const target of targets) {
        assert.ok(
          source.includes(`@use "${target}"`),
          `${file} no longer uses ${target}; remove the exception`,
        );
      }
    }
  });
});
