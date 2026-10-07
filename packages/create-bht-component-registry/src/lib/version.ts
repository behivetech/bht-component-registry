import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_NAME = "create-bht-component-registry";

/**
 * The CLI's own version doubles as the default template version: this package
 * and the template repo are released together, so `npx create-bht-component-registry@0.3.0`
 * scaffolds from the `create-bht-component-registry@0.3.0` tag that `changeset publish` made. It is read from package.json at runtime
 * rather than baked in with a build-time define so the same code works from
 * `src/` under vitest and from the bundled `dist/cli.js`.
 */
export function readOwnVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      const pkg = JSON.parse(readFileSync(candidate, "utf8")) as { name?: unknown; version?: unknown };
      if (pkg.name === CLI_NAME && typeof pkg.version === "string") return pkg.version;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Cannot find ${CLI_NAME}'s package.json to read its version.`);
}
