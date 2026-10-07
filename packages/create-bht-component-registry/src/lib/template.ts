import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { extract } from "tar";
import { CONFIG_FILE } from "./config.js";
import type { Logger } from "./log.js";

export const TEMPLATE_REPO = "behivetech/bht-component-registry";

export interface TemplateRequest {
  /** The release to download; ignored when `from` is set. */
  version: string;
  /** Dev mode: a local checkout of the template repo, used as-is. */
  from?: string;
}

export interface TemplateResult {
  /** The template's root directory, with registry.config.json at the top. */
  dir: string;
  /** Where it came from, for the log. */
  source: string;
  /** Deletes any temp files; a no-op for `from`. */
  cleanup(): Promise<void>;
}

export type TemplateFetcher = (request: TemplateRequest, log: Logger) => Promise<TemplateResult>;

export function tagTarballUrl(version: string): string {
  return `https://github.com/${TEMPLATE_REPO}/archive/refs/tags/v${version}.tar.gz`;
}

export function mainTarballUrl(): string {
  return `https://github.com/${TEMPLATE_REPO}/archive/refs/heads/main.tar.gz`;
}

/**
 * The template IS the public repo: a release tag's tarball, so there is no
 * separate template store to publish or keep in sync. The tag is tried first;
 * `main` is the fallback so the CLI keeps working between a package publish
 * and its tag landing, with a warning because `main` may be ahead of what
 * `templateVersion` will claim.
 */
async function download(version: string, log: Logger): Promise<{ bytes: Buffer; url: string }> {
  let url = tagTarballUrl(version);
  log.info(`Downloading template v${version} from GitHub...`);
  let response = await fetch(url, { redirect: "follow" });
  if (response.status === 404) {
    log.warn(`No release tag v${version} on GitHub; falling back to the main branch.`);
    url = mainTarballUrl();
    response = await fetch(url, { redirect: "follow" });
  }
  if (!response.ok) {
    throw new Error(`Template download failed: ${url} returned HTTP ${response.status}.`);
  }
  return { bytes: Buffer.from(await response.arrayBuffer()), url };
}

export const fetchTemplate: TemplateFetcher = async (request, log) => {
  if (request.from !== undefined) {
    const dir = resolve(request.from);
    if (!existsSync(join(dir, CONFIG_FILE))) {
      throw new Error(`--from ${request.from} is not a bht-component-registry checkout (no ${CONFIG_FILE} in it).`);
    }
    log.info(`Using local template checkout ${dir}`);
    return { dir, source: dir, cleanup: async () => undefined };
  }

  const tmp = await mkdtemp(join(tmpdir(), "bht-template-"));
  const cleanup = () => rm(tmp, { recursive: true, force: true });
  try {
    const { bytes, url } = await download(request.version, log);
    const tarball = join(tmp, "template.tar.gz");
    await writeFile(tarball, bytes);
    const dir = join(tmp, "template");
    await mkdir(dir);
    // GitHub wraps the tree in `<repo>-<ref>/`; strip it so `dir` is the repo root.
    await extract({ file: tarball, cwd: dir, strip: 1 });
    await rm(tarball, { force: true });
    if (!existsSync(join(dir, CONFIG_FILE))) {
      throw new Error(`The downloaded template has no ${CONFIG_FILE}; ${url} does not look like a bht-component-registry release.`);
    }
    return { dir, source: url, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};
