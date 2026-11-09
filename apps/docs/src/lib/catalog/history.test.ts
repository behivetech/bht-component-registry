// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyKeep,
  compareVersions,
  currentTab,
  releasesUpTo,
  sortVersionsDesc,
  parseVersionSegments,
  switcherOptions,
  versionFromSlug,
  versionSlug,
  versionSlugInPath,
  versionedPath,
  versionsIndexPath,
} from "./history";

describe("versions", () => {
  it("orders semver newest first, prereleases below their release", () => {
    expect(sortVersionsDesc(["1.2.0", "1.10.0", "1.2.0-beta.1", "0.9.9", "2.0.0"])).toEqual([
      "2.0.0",
      "1.10.0",
      "1.2.0",
      "1.2.0-beta.1",
      "0.9.9",
    ]);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    // Prerelease identifiers compare numerically where both are numbers (semver §11).
    expect(sortVersionsDesc(["1.0.0-beta.2", "1.0.0-beta.10", "1.0.0-alpha", "1.0.0-beta"])).toEqual([
      "1.0.0-beta.10",
      "1.0.0-beta.2",
      "1.0.0-beta",
      "1.0.0-alpha",
    ]);
    expect(compareVersions("1.0.0-rc.1", "1.0.0-1")).toBeGreaterThan(0);
  });

  it("applies the keep policy", () => {
    const all = ["3.1.0", "3.0.0", "2.5.0", "2.4.0", "1.0.0", "1.1.0"];
    expect(applyKeep(all, "all")).toHaveLength(6);
    expect(applyKeep(all, 2)).toEqual(["3.1.0", "3.0.0"]);
    expect(applyKeep(all, 0)).toEqual(["3.1.0"]);
    expect(applyKeep(all, "majors")).toEqual(["3.1.0", "3.0.0", "2.5.0", "1.1.0"]);
    expect(applyKeep([], "majors")).toEqual([]);
  });

  it("slices a changelog at a version", () => {
    const releases = [
      { version: "1.2.0", notes: "c" },
      { version: "1.1.0", notes: "b" },
      { version: "1.0.0", notes: "a" },
    ];
    expect(releasesUpTo(releases, "1.1.0").map((r) => r.version)).toEqual(["1.1.0", "1.0.0"]);
    expect(releasesUpTo(releases, "0.1.0")).toEqual([]);
  });
});

describe("paths", () => {
  const base = "/acme/atoms/button";
  it("builds live and snapshot URLs and drops tabs a snapshot lacks", () => {
    expect(versionedPath(base, null, "/code")).toBe("/acme/atoms/button/code");
    expect(versionedPath(base, "1.2.0", "/code")).toBe("/acme/atoms/button/v/1_2_0/code");
    expect(versionsIndexPath(base)).toBe("/acme/atoms/button/v");
    expect(versionedPath(base, "1.2.0", "/playground")).toBe("/acme/atoms/button/v/1_2_0");
    expect(versionedPath(`${base}/`, "1.2.0")).toBe("/acme/atoms/button/v/1_2_0");
  });

  it("maps versions to dotless tokens and back", () => {
    expect(versionSlug("1.2.0-beta.1")).toBe("1_2_0-beta_1");
    expect(versionFromSlug("1_2_0", ["1.1.0", "1.2.0"])).toBe("1.2.0");
    expect(versionFromSlug("9_9_9", ["1.2.0"])).toBeNull();
  });

  it("lists latest first, marks the snapshot of the current version", () => {
    const options = switcherOptions(base, "1.2.0", ["1.1.0", "1.2.0"]);
    expect(options.map((o) => o.label)).toEqual(["latest (v1.2.0)", "v1.2.0 (snapshot of latest)", "v1.1.0"]);
    expect(options[0]!.path("/changelog")).toBe("/acme/atoms/button/changelog");
    expect(options[2]!.path("/changelog")).toBe("/acme/atoms/button/v/1_1_0/changelog");
  });

  it("reads the tab out of a live or a versioned pathname", () => {
    expect(currentTab("/acme/atoms/button", base)).toBe("");
    expect(currentTab("/acme/atoms/button/examples", base)).toBe("/examples");
    expect(currentTab("/acme/atoms/button/v/1_2_0", base)).toBe("");
    expect(currentTab("/acme/atoms/button/v/1_2_0/code", base)).toBe("/code");
    expect(currentTab("/acme/atoms/button/v", base)).toBe("");
    expect(currentTab("/elsewhere", base)).toBe("");
    expect(versionSlugInPath("/acme/atoms/button/v/1_2_0/code")).toBe("1_2_0");
    expect(versionSlugInPath("/acme/atoms/button/v/1_2_0-beta_1")).toBe("1_2_0-beta_1");
    expect(versionSlugInPath("/acme/atoms/button/v")).toBeNull();
    expect(versionSlugInPath("/acme/atoms/button/code")).toBeNull();
  });

  it("parses the catch-all segments", () => {
    expect(parseVersionSegments(undefined)).toEqual({ kind: "index" });
    expect(parseVersionSegments([])).toEqual({ kind: "index" });
    expect(parseVersionSegments(["1_2_0"])).toEqual({ kind: "page", slug: "1_2_0", tab: "" });
    expect(parseVersionSegments(["1_2_0", "code"])).toEqual({ kind: "page", slug: "1_2_0", tab: "/code" });
    expect(parseVersionSegments(["1_2_0", "playground"])).toEqual({ kind: "unknown" });
    expect(parseVersionSegments(["1_2_0", "code", "x"])).toEqual({ kind: "unknown" });
  });
});
