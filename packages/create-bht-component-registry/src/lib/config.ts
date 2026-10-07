import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { slugProblem } from "@bht-component-registry/scope";
import { readText, writeText } from "./fs.js";

export const CONFIG_FILE = "registry.config.json";

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  title: string;
  description?: string;
  logo?: string;
  primaryColor?: string;
  links?: SiteLink[];
}

/** Mirrors registry.config.schema.json; the schema stays the source of truth. */
export interface RegistryConfig {
  $schema?: string;
  scope: string;
  npmRegistry: string;
  templateVersion: string;
  site: SiteConfig;
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, source: string): string {
  const value = record[key];
  if (typeof value !== "string" || value === "") {
    throw new Error(`${source}: "${key}" must be a non-empty string.`);
  }
  return value;
}

/**
 * Validates just enough to act on: the four required fields and that `site`
 * is an object. Anything else passes through untouched so a newer template's
 * extra fields survive a round-trip through an older CLI.
 */
export function parseRegistryConfig(text: string, source = CONFIG_FILE): RegistryConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(raw)) throw new Error(`${source} must be a JSON object.`);
  if (!isRecord(raw.site)) throw new Error(`${source}: "site" must be an object.`);
  return {
    ...raw,
    scope: requireString(raw, "scope", source),
    npmRegistry: requireString(raw, "npmRegistry", source),
    templateVersion: requireString(raw, "templateVersion", source),
    site: { ...raw.site, title: requireString(raw.site, "title", `${source} site`) },
  };
}

export async function readRegistryConfig(dir: string): Promise<RegistryConfig> {
  return parseRegistryConfig(await readText(join(dir, CONFIG_FILE)));
}

export function serializeRegistryConfig(config: RegistryConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

export async function writeRegistryConfig(dir: string, config: RegistryConfig): Promise<void> {
  await writeText(join(dir, CONFIG_FILE), serializeRegistryConfig(config));
}

/** The nearest ancestor (including `start`) holding a registry.config.json, or null. */
export function findRegistryRoot(start: string): string | null {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, CONFIG_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The human message for a scope the registry cannot use, or null when it can.
 * Rules come from `@bht-component-registry/scope` so the generator, the docs
 * site and this CLI never disagree about what a valid scope is.
 */
export function scopeProblemMessage(scope: string): string | null {
  switch (slugProblem(scope)) {
    case "empty":
      return "Scope is required: the npm scope your components publish under, e.g. acme → @acme/*.";
    case "format":
      return "Scope must be lowercase letters, digits and hyphens, 1–40 chars, e.g. acme → @acme/*.";
    case "reserved":
      return `'${scope}' is reserved; pick another scope.`;
    default:
      return null;
  }
}

/** `acme-corp` → `Acme Corp`: the display name for scope.json and the site title. */
export function titleCaseScope(scope: string): string {
  return scope
    .split("-")
    .filter((part) => part !== "")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isVersion(value: string): boolean {
  return VERSION_PATTERN.test(value);
}

/** Plain x.y.z comparison; template versions never carry prerelease tags. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  for (const value of [a, b]) {
    if (!isVersion(value)) throw new Error(`"${value}" is not a version of the form x.y.z.`);
  }
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l < r) return -1;
    if (l > r) return 1;
  }
  return 0;
}
