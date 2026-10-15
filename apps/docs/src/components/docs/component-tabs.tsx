"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./component-tabs.module.scss";

const TABS = [
  { path: "", label: "Overview" },
  { path: "/compositions", label: "Compositions" },
  { path: "/code", label: "Code" },
  { path: "/playground", label: "Playground" },
  { path: "/changelog", label: "Changelog" },
];

const DESIGN_TAB = { path: "/design", label: "Design" };

/** Tabs are routes, so each one is linkable and prerendered. The Design tab exists only for a component with design links. */
export function ComponentTabs({ base, design = false }: { base: string; design?: boolean }) {
  const pathname = usePathname();
  const tabs = design ? [...TABS, DESIGN_TAB] : TABS;
  return (
    <nav className={styles.tabs} aria-label="Component sections">
      {tabs.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = pathname === href;
        return (
          <Link key={tab.path} href={href} className={`${styles.tab} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
