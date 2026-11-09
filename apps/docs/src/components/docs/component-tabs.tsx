"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getClassName } from "@bht-component-registry/class-names";
import { SNAPSHOT_TABS, versionedPath } from "@/lib/catalog/history";
import styles from "./component-tabs.module.scss";

const TABS = [
  { path: "", label: "Overview" },
  { path: "/examples", label: "Examples" },
  { path: "/code", label: "Code" },
  { path: "/playground", label: "Playground" },
  { path: "/changelog", label: "Changelog" },
];

const DESIGN_TAB = { path: "/design", label: "Design" };

/**
 * Tabs are routes, so each one is linkable and prerendered. The Design tab
 * exists only for a component with design links. On a past version's page
 * (`…/v/<version>`, read from the URL's params) the tabs point at the same
 * version and drop Playground and Design, which need the current build.
 */
export function ComponentTabs({
  base: liveBase,
  design = false,
}: {
  base: string;
  design?: boolean;
}) {
  const pathname = usePathname();
  const { version } = useParams<{ version?: string }>();
  const tabs = version
    ? TABS.filter((tab) => (SNAPSHOT_TABS as readonly string[]).includes(tab.path))
    : design
      ? [...TABS, DESIGN_TAB]
      : TABS;
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ComponentTabs",
    styles,
  });
  return (
    <nav className={rootClass} aria-label="Component sections">
      {tabs.map((tab) => {
        const href = versionedPath(liveBase, version ?? null, tab.path);
        const active = pathname === href;
        // The active tab is styled from aria-current, so the state has one source.
        return (
          <Link
            key={tab.path}
            href={href}
            className={getChildClass("tab")}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
