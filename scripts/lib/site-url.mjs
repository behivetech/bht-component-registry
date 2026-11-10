import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The one place the docs site's URL is decided. `BHT_DOCS_SITE_URL` (optional) wins
 * over `registry.config.json#site.url`, so a fork or a staging deploy sets its
 * own address without editing the committed config. Every reader of the site
 * URL goes through `siteUrl()`; nothing else reads either source.
 */
export const SITE_URL_VARIABLE = "BHT_DOCS_SITE_URL";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRAILING_SLASHES = /\/+$/;

/** `registry.config.json` as parsed JSON. */
const readConfig = () =>
  JSON.parse(readFileSync(join(ROOT, "registry.config.json"), "utf8"));

/**
 * Checks one `BHT_DOCS_SITE_URL` value: an absolute https URL with no credentials,
 * query or fragment (a package path is appended to it), trailing slash removed.
 *
 * @param {string} value the trimmed, non-empty variable value
 * @returns {string} the URL without a trailing slash
 * @throws {Error} naming the variable when the value is not acceptable
 */
const validateEnvUrl = (value) => {
  const fail = (reason) =>
    new Error(
      `${SITE_URL_VARIABLE} must be an absolute https:// URL (${reason}); got "${value}".`,
    );
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw fail("not a URL");
  }
  if (parsed.protocol !== "https:") throw fail("not https");
  if (!parsed.hostname) throw fail("no host");
  if (parsed.username || parsed.password) throw fail("no credentials");
  if (parsed.search || parsed.hash) throw fail("no query or fragment");
  return value.replace(TRAILING_SLASHES, "");
};

/**
 * Where the docs site is served: `BHT_DOCS_SITE_URL` when set (trimmed; blank counts
 * as unset), else `registry.config.json#site.url`, else null. Never required.
 *
 * @param {{ env?: Record<string, string | undefined>, config?: { site?: { url?: string } } }} [options]
 *   overrides for tests; default to `process.env` and the repo's config file
 * @returns {string | null} the URL without a trailing slash, or null when neither source is set
 * @throws {Error} when `BHT_DOCS_SITE_URL` is set to an invalid value (the build or publish stops)
 */
export const siteUrl = ({ env = process.env, config } = {}) => {
  const fromEnv = env[SITE_URL_VARIABLE]?.trim();
  let result = null;
  if (fromEnv) {
    result = validateEnvUrl(fromEnv);
  } else {
    const fromConfig = (config ?? readConfig()).site?.url
      ?.trim()
      .replace(TRAILING_SLASHES, "");
    result = fromConfig || null;
  }
  return result;
};

/**
 * The docs page for a package: the site URL plus `<scope>/<category>/<name>`.
 *
 * @param {string} relativePath the package's path under `registry/`, with forward slashes
 * @param {Parameters<typeof siteUrl>[0]} [options] passed to `siteUrl`
 * @returns {string | null} null when no site URL is set or the package is outside `registry/`
 */
export const docsUrl = (relativePath, options) => {
  const base = siteUrl(options);
  const outside = relativePath.startsWith("..");
  return base && !outside ? `${base}/${relativePath}` : null;
};
