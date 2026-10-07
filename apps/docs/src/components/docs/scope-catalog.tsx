"use client";

import { useDeferredValue, useState } from "react";
import { TextField } from "@/ui/text-field";
import { EmptyState } from "@/ui/empty-state";
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

  const visible = groups
    .map((group) => ({
      ...group,
      components: group.components.filter(
        (c) => !deferred || [c.name, c.title, c.summary, c.packageName, ...c.tags].some((f) => f.toLowerCase().includes(deferred)),
      ),
    }))
    .filter((group) => group.components.length > 0);

  const total = groups.reduce((n, g) => n + g.components.length, 0);

  return (
    <div className={styles.catalog}>
      <div className={styles.toolbar}>
        <TextField
          type="search"
          placeholder={`Search ${total} components…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search components"
          className={styles.search}
        />
      </div>
      {visible.length === 0 ? (
        <EmptyState description={`Nothing matches “${query}”.`} />
      ) : (
        visible.map((group) => (
          <section key={group.key} className={styles.group}>
            <h2 className={styles.groupTitle}>
              {group.label} <span className={styles.groupCount}>{group.components.length}</span>
            </h2>
            <div className={styles.grid}>
              {group.components.map((component) => (
                <ComponentCard key={component.packageName} component={component} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
