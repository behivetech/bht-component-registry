"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getClassName } from "@bht-component-registry/class-names";
import {
  currentTab,
  switcherOptions,
  versionFromSlug,
  versionSlugInPath,
  versionsIndexPath,
} from "@/lib/catalog/history";
import styles from "./version-switcher.module.scss";

/**
 * The version switcher in a component's header: a disclosure that opens a
 * list of links — the live page ("latest") and every snapshot under
 * docs-history/, newest first — each to the same tab at that version (a tab a
 * snapshot lacks lands on its overview). Links rather than a <select> that
 * navigates on change: arrowing through a closed native select fires change
 * on every step in some browsers, which would load a page per keystroke. With
 * no snapshots it is the plain version label the header always had. A
 * registry whose chrome has a menu component can swap it in behind the same
 * props.
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
  const label = selected === "latest" ? `v${current} (latest)` : `v${selected}`;

  return (
    // Keyed on the pathname so the disclosure remounts closed after a
    // navigation; otherwise it would stay open on the next page.
    <details key={pathname} className={rootClass}>
      <summary className={getChildClass("summary")} aria-label={`Version ${label}, choose another`}>
        {label}
      </summary>
      <ul className={getChildClass("list")}>
        {options.map((option) => (
          <li key={option.value}>
            <Link
              href={option.path(tab)}
              className={getChildClass("option")}
              aria-current={option.value === selected ? "page" : undefined}
            >
              {option.label}
            </Link>
          </li>
        ))}
        <li>
          <Link href={versionsIndexPath(base)} className={getChildClass("option")}>
            All versions…
          </Link>
        </li>
      </ul>
    </details>
  );
}
