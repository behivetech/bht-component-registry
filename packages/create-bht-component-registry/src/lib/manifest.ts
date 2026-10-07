import { join } from "node:path";
import { readText } from "./fs.js";

export const MANIFEST_FILE = "template.manifest.json";
export const DEFAULT_README_MARKER = "<!-- your notes below this line are kept by update -->";

/**
 * What the template owns, as data. `update` reads this from the TARGET
 * template so a newer release can take over (or give up) paths without
 * shipping a new CLI first.
 */
export interface TemplateManifest {
  /** Globs `update` may add, replace or remove. */
  owned: string[];
  /** Globs `update` never touches, even when `owned` matches them. */
  never: string[];
  /**
   * Globs that live in the template repo but must never reach a client repo:
   * the CLI's own source, the template's issue/PR templates. `create` skips
   * them and `update` removes any an older template left behind.
   */
  templateOnly: string[];
  /** The README.md line above which the template's text is replaced on update. */
  readmeMarker: string;
  /** Owned files that mention the example scope and get the owner's scope re-applied after copy. */
  rewriteScope: string[];
}

/**
 * Used when a template has no manifest (the fixture of a `--from` checkout
 * mid-edit, or a very early template). Kept identical to the repo's
 * template.manifest.json on purpose.
 */
export const DEFAULT_MANIFEST: TemplateManifest = {
  owned: [
    "apps/docs/**",
    "packages/**",
    "turbo/generators/**",
    ".github/workflows/**",
    ".changeset/config.json",
    "turbo.json",
    "pnpm-workspace.yaml",
    "package.json",
    "registry.config.schema.json",
    "template.manifest.json",
    "template.manifest.schema.json",
    ".gitignore",
    "Dockerfile",
    "nginx.conf",
    "CLAUDE.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "LICENSE",
    "docs/**",
  ],
  never: ["registry/**", "registry.config.json", ".changeset/*.md", "apps/docs/src/generated/**"],
  templateOnly: ["packages/create-bht-component-registry/**", ".github/ISSUE_TEMPLATE/**", ".github/PULL_REQUEST_TEMPLATE.md"],
  readmeMarker: DEFAULT_README_MARKER,
  rewriteScope: ["apps/docs/e2e/public.spec.ts", "apps/docs/package.json"],
};

function stringArray(value: unknown, key: string, source: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${source}: "${key}" must be an array of strings.`);
  }
  return value as string[];
}

export function parseManifest(text: string, source = MANIFEST_FILE): TemplateManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${source} must be a JSON object.`);
  }
  const record = raw as Record<string, unknown>;
  const marker = record.readmeMarker ?? DEFAULT_README_MARKER;
  if (typeof marker !== "string" || marker.trim() === "") {
    throw new Error(`${source}: "readmeMarker" must be a non-empty string.`);
  }
  return {
    owned: stringArray(record.owned, "owned", source),
    never: stringArray(record.never ?? [], "never", source),
    templateOnly: stringArray(record.templateOnly ?? [], "templateOnly", source),
    readmeMarker: marker,
    rewriteScope: stringArray(record.rewriteScope ?? [], "rewriteScope", source),
  };
}

export async function readManifest(dir: string): Promise<TemplateManifest> {
  return parseManifest(await readText(join(dir, MANIFEST_FILE)));
}

/**
 * The glob dialect the manifest needs and nothing more: `**` crosses
 * directories, `*` and `?` stay within one segment, everything else is
 * literal. A dependency-free matcher keeps the published CLI tiny and the
 * semantics obvious to whoever edits the manifest.
 */
export function globToRegExp(glob: string): RegExp {
  let pattern = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob.charAt(i);
    if (char === "*") {
      if (glob.charAt(i + 1) === "*") {
        if (glob.charAt(i + 2) === "/") {
          // "**/" matches zero or more whole directories.
          pattern += "(?:.*/)?";
          i += 2;
        } else {
          // A trailing or bare "**" matches the rest of the path.
          pattern += ".*";
          i += 1;
        }
      } else {
        pattern += "[^/]*";
      }
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`);
}

export function matchesAny(path: string, globs: string[]): boolean {
  return globs.some((glob) => globToRegExp(glob).test(path));
}

/**
 * A path that must not exist in a client repo. Directories are passed with a
 * trailing slash by `create`'s copy filter so `foo/**` also covers the folder
 * itself and the whole subtree is skipped in one go.
 */
export function isTemplateOnly(path: string, manifest: TemplateManifest): boolean {
  return matchesAny(path, manifest.templateOnly);
}

/**
 * Owned, not template-only and not protected. `templateOnly` is checked first
 * (the CLI package sits under the owned `packages/**`), and `never` wins over
 * `owned` so a broad glob cannot reach the owner's files.
 */
export function isTemplateOwned(path: string, manifest: TemplateManifest): boolean {
  if (isTemplateOnly(path, manifest)) return false;
  return matchesAny(path, manifest.owned) && !matchesAny(path, manifest.never);
}

export interface ReadmeParts {
  /** Everything before the marker line: the template's part. */
  above: string;
  /** The marker line and everything after it: the owner's notes. */
  below: string;
}

export function splitReadme(text: string, marker: string): ReadmeParts | null {
  const index = text.indexOf(marker);
  if (index === -1) return null;
  return { above: text.slice(0, index), below: text.slice(index) };
}

/**
 * The target's text above the marker plus the owner's text from the marker
 * down. Returns null when the local README has no marker: then there is no
 * way to tell the template's part from the owner's, and leaving it alone
 * beats guessing. A target without a marker keeps the owner's marker so the
 * next update still works.
 */
export function mergeReadme(local: string, target: string, marker: string): string | null {
  const localParts = splitReadme(local, marker);
  if (!localParts) return null;
  const targetParts = splitReadme(target, marker);
  const above = targetParts ? targetParts.above : `${target.trimEnd()}\n\n`;
  return above + localParts.below;
}
