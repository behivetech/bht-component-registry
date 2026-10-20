"use client";

import { useDeferredValue, useState } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import { TextField } from "@behivetech/atoms.text-field";
import { EmptyState } from "@behivetech/molecules.empty-state";
import type { ComponentCardModel } from "@/lib/catalog/card-model";
import { ComponentCard } from "./component-card";
import styles from "./scope-catalog.module.scss";

export interface CatalogGroup {
  key: string;
  label: string;
  components: ComponentCardModel[];
}

/**
 * Client-side filtering over a scope's components. The list is already in
 * the page (it's build-time data), so searching is instant and needs no
 * request; `useDeferredValue` keeps typing smooth while thirty live
 * thumbnails re-render.
 */
export function ScopeCatalog({ groups }: { groups: CatalogGroup[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ScopeCatalog",
    styles,
  });

  const visible = groups
    .map((group) => ({
      ...group,
      components: group.components.filter(
        (c) =>
          !deferred ||
          [c.name, c.title, c.summary, c.packageName, ...c.tags].some((f) =>
            f.toLowerCase().includes(deferred),
          ),
      ),
    }))
    .filter((group) => group.components.length > 0);

  const total = groups.reduce((n, g) => n + g.components.length, 0);

  return (
    <div className={rootClass}>
      <div className={getChildClass("toolbar")}>
        <TextField
          type="search"
          placeholder={`Search ${total} components…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search components"
          className={getChildClass("search")}
        />
      </div>
      {visible.length === 0 ? (
        <EmptyState description={`Nothing matches “${query}”.`} />
      ) : (
        visible.map((group) => (
          <section key={group.key} className={getChildClass("group")}>
            <h2 className={getChildClass("group-title")}>
              {group.label}{" "}
              <span className={getChildClass("group-count")}>
                {group.components.length}
              </span>
            </h2>
            <div className={getChildClass("grid")}>
              {group.components.map((component) => (
                <ComponentCard
                  key={component.packageName}
                  component={component}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
