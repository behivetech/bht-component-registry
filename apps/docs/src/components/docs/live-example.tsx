"use client";

import { useEffect, useRef, useState } from "react";
import { LiveEditor, LiveError, LivePreview, LiveProvider } from "react-live";
import { themes } from "prism-react-renderer";
import { sandboxScope } from "./sandbox-scope";
import {
  SANDBOX_PATH,
  encodeSandboxHash,
  type FromSandbox,
  type ToSandbox,
} from "./sandbox-protocol";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./live-example.module.scss";

export interface LiveExampleProps {
  /** The code to run. In `noInline` mode it must call `render(...)`; otherwise it's one JSX expression. */
  code: string;
  noInline?: boolean;
  /** Start with the editor open. Defaults to closed — the preview is what most readers want first. */
  editorOpen?: boolean;
  /** Render inline with no frame, editor or controls (catalog thumbnails). */
  previewOnly?: boolean;
  /** Minimum preview height in px. Overlays need room to open inside their frame. */
  minHeight?: number;
  title?: string;
  className?: string;
}

const DEFAULT_MIN_HEIGHT = 96;
const EXPANDED_MIN_HEIGHT = 560;
/** Keystrokes are batched before the frame re-runs the program. */
const SEND_DELAY_MS = 150;

/**
 * A component rendered from source, with the source editable in place.
 *
 * react-live transforms the code in the browser (TypeScript included), so
 * the reader can change a prop and see the result without a build step.
 * The scope is the whole registry, which is what lets a snippet reference
 * any component the way its README does.
 *
 * The preview runs in its own document (an iframe at `/sandbox`): a modal,
 * drawer or toast portals to *that* body and covers the preview, not the
 * docs page. Catalog thumbnails stay inline — dozens of frames per page
 * would be too heavy, and overlays are kept off the tiles anyway.
 */
export function LiveExample(props: LiveExampleProps) {
  return props.previewOnly ? (
    <InlineExample {...props} />
  ) : (
    <FramedExample {...props} />
  );
}

function InlineExample({
  code,
  noInline = false,
  title,
  className,
}: LiveExampleProps) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "LiveExample",
    styles,
    className,
    modifiers: { inline: true },
  });
  return (
    <LiveProvider
      code={code}
      scope={sandboxScope}
      noInline={noInline}
      language="tsx"
    >
      <figure className={rootClass}>
        {title && (
          <figcaption className={getChildClass("bar")}>
            <span className={getChildClass("title")}>{title}</span>
          </figcaption>
        )}
        <div className={getChildClass("body")}>
          <LivePreview />
          <LiveError className={getChildClass("error")} />
        </div>
      </figure>
    </LiveProvider>
  );
}

function FramedExample({
  code: initialCode,
  noInline = false,
  editorOpen = false,
  minHeight = DEFAULT_MIN_HEIGHT,
  title,
  className,
}: LiveExampleProps) {
  const figureRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [code, setCode] = useState(initialCode);
  const [showEditor, setShowEditor] = useState(editorOpen);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  // Mount the frame only as it approaches the viewport; a long compositions
  // page would otherwise boot every example at once.
  useEffect(() => {
    const element = figureRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The frame says when it can take a program, and how tall its content is.
  useEffect(() => {
    const onMessage = (event: MessageEvent<FromSandbox>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
      if (event.data?.type === "bht-sandbox:ready") setReady(true);
      else if (event.data?.type === "bht-sandbox:height")
        setContentHeight(event.data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Send the program once the frame is ready, after each (debounced) edit,
  // and again whenever the site's forced theme changes.
  useEffect(() => {
    if (!ready) return;
    const send = () => {
      const message: ToSandbox = {
        type: "bht-sandbox:code",
        code,
        noInline,
        theme: document.documentElement.dataset.theme ?? null,
      };
      frameRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin,
      );
    };
    const timer = window.setTimeout(send, SEND_DELAY_MS);
    const themeObserver = new MutationObserver(send);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      window.clearTimeout(timer);
      themeObserver.disconnect();
    };
  }, [ready, code, noInline]);

  const floor = expanded ? Math.max(EXPANDED_MIN_HEIGHT, minHeight) : minHeight;
  const height = Math.max(floor, contentHeight);
  const frameTitle = title ? ` — live preview` : "Live preview";
  const [rootClass, getChildClass] = getClassName({
    rootClass: "LiveExample",
    styles,
    className,
  });

  return (
    <figure ref={figureRef} className={rootClass}>
      <figcaption className={getChildClass("bar")}>
        <span className={getChildClass("title")}>{title}</span>
        <span className={getChildClass("actions")}>
          <button
            type="button"
            className={getChildClass("toggle")}
            onClick={() => setExpanded((open) => !open)}
            aria-pressed={expanded}
          >
            {expanded ? "Shrink" : "Expand"}
          </button>
          <a
            className={getChildClass("toggle")}
            href={`${SANDBOX_PATH}#${encodeSandboxHash({ code, noInline })}`}
            target="_blank"
            rel="noopener"
          >
            Open in new tab
          </a>
          <button
            type="button"
            className={getChildClass("toggle")}
            onClick={() => setShowEditor((open) => !open)}
            aria-expanded={showEditor}
          >
            {showEditor ? "Hide code" : "Edit code"}
          </button>
        </span>
      </figcaption>
      {/* The frame is sized to its content by the height it reports; the
          custom property is the one dynamic value the stylesheet needs. */}
      <div
        className={getChildClass("preview")}
        style={
          {
            ["--preview-height" as string]: `${height}px`,
          } as React.CSSProperties
        }
      >
        {visible && (
          <iframe
            ref={frameRef}
            src={SANDBOX_PATH}
            title={frameTitle}
            className={getChildClass("frame")}
          />
        )}
      </div>
      {showEditor && (
        <div className={getChildClass("editor")}>
          <LiveEditor
            code={code}
            onChange={setCode}
            language="tsx"
            theme={themes.nightOwl}
            className={getChildClass("editor-inner")}
          />
        </div>
      )}
    </figure>
  );
}
