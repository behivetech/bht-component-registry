"use client";

import { useState } from "react";
import { LiveEditor, LiveError, LivePreview, LiveProvider } from "react-live";
import { themes } from "prism-react-renderer";
import { sandboxScope } from "./sandbox-scope";
import styles from "./live-example.module.scss";

export interface LiveExampleProps {
  /** The code to run. In `noInline` mode it must call `render(...)`; otherwise it's one JSX expression. */
  code: string;
  noInline?: boolean;
  /** Start with the editor open. Defaults to closed — the preview is what most readers want first. */
  editorOpen?: boolean;
  /** Hide the editor toggle entirely (catalog thumbnails). */
  previewOnly?: boolean;
  title?: string;
  className?: string;
}

/**
 * A component rendered from source, with the source editable in place.
 *
 * react-live transforms the code in the browser (TypeScript included), so
 * the reader can change a prop and see the result without a build step.
 * The scope is the whole registry, which is what lets a snippet reference
 * any component the way its README does.
 */
export function LiveExample({ code, noInline = false, editorOpen = false, previewOnly = false, title, className }: LiveExampleProps) {
  const [showEditor, setShowEditor] = useState(editorOpen);

  return (
    <LiveProvider code={code} scope={sandboxScope} noInline={noInline} theme={themes.nightOwl} language="tsx">
      <figure className={`${styles.example} ${className ?? ""}`}>
        {(title || !previewOnly) && (
          <figcaption className={styles.bar}>
            <span className={styles.title}>{title}</span>
            {!previewOnly && (
              <button type="button" className={styles.toggle} onClick={() => setShowEditor((open) => !open)} aria-expanded={showEditor}>
                {showEditor ? "Hide code" : "Edit code"}
              </button>
            )}
          </figcaption>
        )}
        <div className={styles.preview}>
          <LivePreview />
          <LiveError className={styles.error} />
        </div>
        {showEditor && (
          <div className={styles.editor}>
            <LiveEditor className={styles.editorInner} />
          </div>
        )}
      </figure>
    </LiveProvider>
  );
}
