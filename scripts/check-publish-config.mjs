import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `pnpm check:publish` — every component's `publishConfig` is consistent with
 * registry.config.json, and no released package has changed where it goes.
 *
 * A package is public (npmRegistry, access public) or private
 * (privateRegistry, access restricted), decided when it is generated. Once a
 * version has been released — `changeset publish` tags `<name>@<version>` —
 * that decision is permanent: a public name cannot be reliably unpublished,
 * and a private package made public exposes its history. So this compares a
 * released package's publishConfig with the one at its latest release tag and
 * refuses a change. Before the first release a mistake can still be fixed.
 *
 * Runs in `pnpm verify` and in CI (which checks out full history so the tags
 * are there). Exit code 1 with a message per problem.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = join(ROOT, "registry.config.json");

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const trimSlash = (url) => String(url).replace(/\/+$/, "");

function componentPackages() {
  const registry = join(ROOT, "registry");
  if (!existsSync(registry)) return [];
  const result = [];
  for (const scope of readdirSync(registry, { withFileTypes: true })) {
    if (!scope.isDirectory() || scope.name.startsWith(".")) continue;
    for (const category of readdirSync(join(registry, scope.name), { withFileTypes: true })) {
      if (!category.isDirectory() || category.name.startsWith(".")) continue;
      for (const name of readdirSync(join(registry, scope.name, category.name), { withFileTypes: true })) {
        const rel = `registry/${scope.name}/${category.name}/${name.name}/package.json`;
        if (name.isDirectory() && existsSync(join(ROOT, rel))) result.push(rel);
      }
    }
  }
  return result;
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** The latest release tag of a package, by version, or null if never released. */
function latestReleaseTag(packageName) {
  const out = git(["tag", "-l", `${packageName}@*`]);
  if (!out) return null;
  const byVersion = (tag) => tag.slice(packageName.length + 1).split(".").map((n) => Number.parseInt(n, 10) || 0);
  return out
    .split("\n")
    .filter(Boolean)
    .sort((a, b) => {
      const [x, y] = [byVersion(a), byVersion(b)];
      for (let i = 0; i < 3; i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
      return 0;
    })[0];
}

function publishConfigAt(tag, rel) {
  const text = git(["show", `${tag}:${rel}`]);
  if (text === null) return null;
  try {
    return JSON.parse(text).publishConfig ?? null;
  } catch {
    return null;
  }
}

const config = existsSync(CONFIG_FILE) ? readJson(CONFIG_FILE) : {};
const publicRegistry = trimSlash(config.npmRegistry ?? "https://registry.npmjs.org");
const privateRegistry = config.privateRegistry ? trimSlash(config.privateRegistry) : null;

const problems = [];
for (const rel of componentPackages()) {
  const pkg = readJson(join(ROOT, rel));
  if (pkg.private === true) continue; // never published; nothing to keep consistent
  const publish = pkg.publishConfig ?? {};
  const registry = publish.registry ? trimSlash(publish.registry) : null;
  const access = publish.access ?? "public";

  if (!registry) {
    problems.push(`${rel}: publishConfig.registry is missing; set it to ${publicRegistry} (public) or privateRegistry (private).`);
    continue;
  }
  const isPublic = registry === publicRegistry && access === "public";
  const isPrivate = privateRegistry !== null && registry === privateRegistry && access === "restricted";
  if (!isPublic && !isPrivate) {
    problems.push(
      `${rel}: publishConfig { registry: ${registry}, access: ${access} } matches neither public (${publicRegistry}, public) nor private (${privateRegistry ?? "privateRegistry not set in registry.config.json"}, restricted).`,
    );
  }

  const tag = latestReleaseTag(pkg.name);
  if (!tag) continue;
  const released = publishConfigAt(tag, rel);
  if (!released) continue;
  const releasedRegistry = released.registry ? trimSlash(released.registry) : null;
  const releasedAccess = released.access ?? "public";
  if (releasedRegistry !== registry || releasedAccess !== access) {
    problems.push(
      `${rel}: ${pkg.name} was released (${tag}) with publishConfig { registry: ${releasedRegistry}, access: ${releasedAccess} }; it cannot move to { registry: ${registry}, access: ${access} }. A package's registry is permanent after its first release — publish a new package instead.`,
    );
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`✖ ${problem}`);
  process.exit(1);
}
console.log("publishConfig: every component is consistent with registry.config.json and its release history.");
