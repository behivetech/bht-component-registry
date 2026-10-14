import Link from "next/link";
import type { Metadata } from "next";
import { getDocSections } from "@/lib/docs";
import { DocsShell } from "@/components/docs-shell";
import styles from "@/components/docs-shell.module.scss";

export const metadata: Metadata = { title: "Docs" };

/**
 * The Docs section's front page: every page by section, with its
 * description. The pages are Markdown files under docs/ — the owner's own
 * (contributing, standards, whatever they add with `pnpm gen doc`) and the
 * template's guide, which they are free to edit too.
 */
export default function DocsIndexPage() {
  const sections = getDocSections();
  return (
    <DocsShell>
      <p className={styles.eyebrow}>Docs</p>
      <h1>Documentation</h1>
      {sections.length === 0 ? (
        <p className={styles.muted}>
          No pages yet. Add a Markdown file under <code>docs/</code> — or run <code>pnpm gen doc</code> — and it appears here on
          the next build.
        </p>
      ) : (
        <div className={styles.index}>
          {sections.map((section) => (
            <section key={section.key}>
              <h2>{section.label}</h2>
              <ul className={styles.indexList}>
                {section.pages.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/docs/${page.slug}`} className={styles.indexLink}>
                      {page.title}
                    </Link>
                    {page.description && <p className={styles.indexDescription}>{page.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </DocsShell>
  );
}
