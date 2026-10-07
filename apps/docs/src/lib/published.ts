import { catalog, compareVersions } from "@/lib/catalog";

export interface PublishedVersion {
  version: string;
  publishedAt: string | null;
}

/** Host of the registry `pnpm release` publishes to, from registry.config.json, e.g. "registry.npmjs.org". */
export const publishedRegistryHost = (): string => new URL(catalog.npmRegistry).host;

/**
 * Versions actually published, as opposed to what the repo's package.json
 * says. Runs at BUILD time (this site is a static export), against the
 * registry in registry.config.json.
 *
 * npmjs answers anonymously for public packages. GitHub Packages and most
 * private registries need a token even for reads; set REGISTRY_READ_TOKEN in
 * the build environment for those. Returns `null` when the registry could not
 * be asked (no token, offline, non-2xx), so the page can say so instead of
 * failing the build; `[]` means the registry answered "never published".
 */
export async function loadPublishedVersions(packageName: string): Promise<PublishedVersion[] | null> {
  const token = process.env.REGISTRY_READ_TOKEN;
  const url = `${catalog.npmRegistry.replace(/\/$/, "")}/${packageName.replace("/", "%2F")}`;

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 404) return [];
    if (!res.ok) return null;

    const data = (await res.json()) as { versions?: Record<string, unknown>; time?: Record<string, string> };
    return Object.keys(data.versions ?? {})
      .sort((a, b) => compareVersions(b, a))
      .map((version) => ({ version, publishedAt: data.time?.[version] ?? null }));
  } catch {
    return null;
  }
}
