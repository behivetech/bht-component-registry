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

/** Tabs are routes, so each one is linkable and prerendered. */
export function ComponentTabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Component sections">
      {TABS.map((tab) => {
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
