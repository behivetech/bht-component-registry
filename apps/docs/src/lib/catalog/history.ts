import type { CatalogRelease } from "./types";

/**
 * Pure helpers for per-version docs. A component's history is the set of
 * snapshot folders under docs-history/<scope>/<category>/<name>/<version>/;
 * these functions order versions, apply the `docs.history.keep` policy, slice
 * a changelog and build the URLs, so the snapshot script, the catalog
 * generator and the pages all agree and each rule is tested once.
 */

export const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** Semver precedence (§11): numeric core, then prerelease identifiers, numeric ones compared as numbers; a release outranks its prereleases. */
export function compareVersions(a: string, b: string): number {
  const split = (v: string): [string, string] => {
    const i = v.indexOf("-");
    return i === -1 ? [v, ""] : [v.slice(0, i), v.slice(i + 1)];
  };
  const [ca, pa] = split(a);
  const [cb, pb] = split(b);
  const na = ca.split(".").map((n) => parseInt(n, 10) || 0);
  const nb = cb.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    const diff = (na[i] ?? 0) - (nb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (pa === pb) return 0;
  if (pa === "") return 1;
  if (pb === "") return -1;
  const ia = pa.split(".");
  const ib = pb.split(".");
  for (let i = 0; i < Math.max(ia.length, ib.length); i += 1) {
    const x = ia[i];
    const y = ib[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return diff;
    } else if (xn !== yn) {
      return xn ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** Newest first. */
export const sortVersionsDesc = (versions: readonly string[]): string[] =>
  [...versions].sort((a, b) => compareVersions(b, a));

export type KeepPolicy = "all" | "majors" | number;

/**
 * The versions a registry keeps under its `docs.history.keep` policy:
 * everything, the newest N, or (`majors`) every snapshot in the current major
 * plus the newest of each older major. The rest is pruned from the folder;
 * git history still has them.
 */
export function applyKeep(versions: readonly string[], keep: KeepPolicy): string[] {
  const sorted = sortVersionsDesc(versions);
  if (keep === "all") return sorted;
  if (typeof keep === "number") return sorted.slice(0, Math.max(1, Math.floor(keep)));
  const currentMajor = sorted[0]?.split(".")[0];
  const seenMajors = new Set<string>();
  return sorted.filter((version) => {
    const major = version.split(".")[0]!;
    if (major === currentMajor) return true;
    if (seenMajors.has(major)) return false;
    seenMajors.add(major);
    return true;
  });
}

/** The changelog as it stood at `version`: that release and everything before it. */
export const releasesUpTo = (releases: readonly CatalogRelease[], version: string): CatalogRelease[] =>
  releases.filter((release) => compareVersions(release.version, version) <= 0);

/** The tabs a snapshot has. Playground and Design need the current build, so they are not among them. */
export const SNAPSHOT_TABS = ["", "/examples", "/code", "/changelog"] as const;
export type SnapshotTab = (typeof SNAPSHOT_TABS)[number];

/**
 * The URL token for a version: `1.2.0` → `1_2_0`, `1.2.0-beta.1` → `1_2_0-beta_1`.
 * Underscores are not valid in semver, so the mapping is one-to-one. A dot
 * in the last path segment reads as a file extension to some static hosts
 * (and the export writes a folder of the same name for the page's payload),
 * so the token keeps the page a plain `.html` everywhere.
 */
export const versionSlug = (version: string) => version.replace(/\./g, "_");

/** The version a token stands for, among the versions that exist. */
export const versionFromSlug = (slug: string, versions: readonly string[]) =>
  versions.find((version) => versionSlug(version) === slug) ?? null;

/**
 * The URL for a component page at a version. `version` null means the live
 * page. Snapshot pages live under one optional catch-all segment,
 * `/<base>/v` (the versions index), `/<base>/v/1_2_0` (overview) and
 * `/<base>/v/1_2_0/code` (a tab), with the version as a dotless token. A tab
 * a snapshot does not have (playground, design) lands on the snapshot's
 * overview, so the switcher never produces a 404.
 */
export function versionedPath(base: string, version: string | null, tab = ""): string {
  const clean = base.replace(/\/$/, "");
  if (version === null) return `${clean}${tab}`;
  const kept = (SNAPSHOT_TABS as readonly string[]).includes(tab) ? tab : "";
  return `${clean}/v/${versionSlug(version)}${kept}`;
}

/** The versions index of a component. */
export const versionsIndexPath = (base: string) => `${base.replace(/\/$/, "")}/v`;

export interface SwitcherOption {
  /** "latest" for the live page, else the version. */
  value: string;
  label: string;
  /** Where the option navigates for a given tab. */
  path: (tab: string) => string;
}

/** The entries of the version switcher: the live page first, then each snapshot newest first. */
export function switcherOptions(
  base: string,
  current: string,
  versions: readonly string[],
): SwitcherOption[] {
  const snapshots = sortVersionsDesc(versions).map((version) => ({
    value: version,
    label: version === current ? `v${version} (snapshot of latest)` : `v${version}`,
    path: (tab: string) => versionedPath(base, version, tab),
  }));
  return [
    { value: "latest", label: `latest (v${current})`, path: (tab: string) => versionedPath(base, null, tab) },
    ...snapshots,
  ];
}

/** The version token in a component pathname (`…/v/1_2_0/code` → "1_2_0"), or null on the live page and the versions index. */
export function versionSlugInPath(pathname: string): string | null {
  return /\/v\/([^/]+)(?:\/|$)/.exec(pathname)?.[1] ?? null;
}

/** The tab part of a component path: "" for an overview, "/examples", … on the live page and on a snapshot alike. */
export function currentTab(pathname: string, base: string): string {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const snapshot = /^\/v(?:\/[^/]+)?(\/.*)?$/.exec(rest);
  const tab = snapshot ? (snapshot[1] ?? "") : rest;
  return tab.replace(/\/$/, "");
}

/** The parsed form of the optional catch-all: nothing (the index), a version token, or a token and a tab. */
export function parseVersionSegments(
  segments: readonly string[] | undefined,
): { kind: "index" } | { kind: "page"; slug: string; tab: SnapshotTab } | { kind: "unknown" } {
  if (!segments || segments.length === 0) return { kind: "index" };
  const [slug, tab, ...rest] = segments;
  if (!slug || rest.length > 0) return { kind: "unknown" };
  const path = tab === undefined ? "" : `/${tab}`;
  if (!(SNAPSHOT_TABS as readonly string[]).includes(path)) return { kind: "unknown" };
  return { kind: "page", slug, tab: path as SnapshotTab };
}
