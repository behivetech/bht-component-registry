import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs after `changeset version` (see the root `version-packages` script).
 *
 * In the template repo, the create-bht-component-registry CLI and the template
 * are released together, and `registry.config.json#templateVersion` must equal
 * the CLI's version: `create` writes that version into new registries and
 * `update --from <checkout>` reads it as the target. This copies the version
 * across so the "Version Packages" commit carries both.
 *
 * In a registry created from the template the CLI package does not exist
 * (it is `templateOnly`), so this is a no-op and `templateVersion` stays the
 * owner's: only `update` may change it there.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPackage = join(ROOT, "packages", "create-bht-component-registry", "package.json");
const configFile = join(ROOT, "registry.config.json");

if (existsSync(cliPackage)) {
  const { version } = JSON.parse(readFileSync(cliPackage, "utf8"));
  const text = readFileSync(configFile, "utf8");
  const current = JSON.parse(text).templateVersion;
  if (current !== version) {
    // Edit the one line in place so the file keeps its formatting.
    const line = /("templateVersion"\s*:\s*")[^"]*(")/;
    if (!line.test(text)) throw new Error("registry.config.json has no templateVersion line to update.");
    writeFileSync(configFile, text.replace(line, `$1${version}$2`));
    console.log(`registry.config.json: templateVersion ${current} → ${version}`);
  }
}
