"use client";

import { usePathname, useRouter } from "next/navigation";
import { getClassName } from "@bht-component-registry/class-names";
import { currentTab, switcherOptions, versionFromSlug, versionSlugInPath } from "@/lib/catalog/history";
import styles from "./version-switcher.module.scss";

/**
 * The version switcher in a component's header: the live page ("latest") and
 * every snapshot under docs-history/, newest first. Choosing one navigates to
 * the same tab at that version (a tab a snapshot lacks lands on its overview).
 * With no snapshots it is just the version label the header always had, so a
 * registry that has never released looks as before.
 *
 * A native <select>: it is a navigation control, it reads correctly to
 * assistive technology, and it needs no state of its own — the URL is the
 * state. A registry whose chrome has a Select component can swap it in behind
 * the same props.
 */
export function VersionSwitcher({
  base,
  current,
  versions,
}: {
  /** "/<scope>/<category>/<name>" */
  base: string;
  /** The version the repo is at: what "latest" means. */
  current: string;
  /** Snapshot versions; an empty list renders a plain label. */
  versions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rootClass, getChildClass] = getClassName({
    rootClass: "VersionSwitcher",
    styles,
    modifiers: { static: versions.length === 0 },
  });

  if (versions.length === 0) {
    return <span className={rootClass}>v{current}</span>;
  }

  const slug = versionSlugInPath(pathname);
  const selected = (slug && versionFromSlug(slug, versions)) ?? "latest";
  const options = switcherOptions(base, current, versions);
  const tab = currentTab(pathname, base);

  return (
    <label className={rootClass}>
      <span className={getChildClass("label")}>Version</span>
      <select
        className={getChildClass("select")}
        value={selected}
        onChange={(event) => {
          const option = options.find((o) => o.value === event.target.value);
          if (option) router.push(option.path(tab));
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
