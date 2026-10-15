import Link from "next/link";
import type { Metadata } from "next";
import { getDocSections } from "@/lib/docs";
import { DocsShell } from "@/components/docs-shell";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./page.module.scss";

export const metadata: Metadata = { title: "Docs" };

/**
 * The Docs section's front page: every page by section, with its
 * description. The pages are Markdown files under docs/ — the owner's own
 * (contributing, standards, whatever they add with `pnpm gen doc`) and the
 * template's guide, which they are free to edit too.
 */
export default function DocsIndexPage() {
  const sections = getDocSections();
  const [rootClass, getChildClass] = getClassName({
    rootClass: "DocsIndexPage",
    styles,
  });
  return (
    <DocsShell>
      <div className={rootClass}>
        <p className={getChildClass("eyebrow")}>Docs</p>
        <h1>Documentation</h1>
        {sections.length === 0 ? (
          <p className={getChildClass("muted")}>
            No pages yet. Add a Markdown file under <code>docs/</code> — or run{" "}
            <code>pnpm gen doc</code> — and it appears here on the next build.
          </p>
        ) : (
          <div className={getChildClass("sections")}>
            {sections.map((section) => (
              <section key={section.key}>
                <h2>{section.label}</h2>
                <ul className={getChildClass("list")}>
                  {section.pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/docs/${page.slug}`}
                        className={getChildClass("link")}
                      >
                        {page.title}
                      </Link>
                      {page.description && (
                        <p className={getChildClass("description")}>
                          {page.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </DocsShell>
  );
}
