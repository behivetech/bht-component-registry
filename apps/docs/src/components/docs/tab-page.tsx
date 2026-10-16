import type { ReactNode } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./tab-page.module.scss";

const [rootClass, getChildClass] = getClassName({
  rootClass: "TabPage",
  styles,
});

/**
 * The body of a component tab (Code, Examples, Playground, Changelog,
 * Design): a vertical stack of sections. `TabPage.Note` is the muted
 * paragraph those tabs use for a path, a hint or an empty state — part of
 * this component so no tab reaches into another's stylesheet.
 */
export function TabPage({ children }: { children: ReactNode }) {
  return <div className={rootClass}>{children}</div>;
}

function TabPageNote({ children }: { children: ReactNode }) {
  return <p className={getChildClass("note")}>{children}</p>;
}

TabPage.Note = TabPageNote;
