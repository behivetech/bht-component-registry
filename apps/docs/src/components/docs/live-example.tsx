"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  SANDBOX_PATH,
  encodeSandboxHash,
  type FromSandbox,
  type ToSandbox,
} from "./sandbox-protocol";
import { getClassName } from "@behivetech/bht-class-names";
import styles from "./live-example.module.scss";

/** The editor loads when "Edit code" is first opened; nothing of it ships before. */
const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });

export interface LiveExampleProps {
  /** The code to run. In `noInline` mode it must call `render(...)`; otherwise it's one JSX expression. */
  code: string;
  noInline?: boolean;
  /** Start with the editor open. Defaults to closed — the preview is what most readers want first. */
  editorOpen?: boolean;
  /** Minimum preview height in px. Overlays need room to open inside their frame. */
  minHeight?: number;
  title?: string;
  className?: string;
}

const DEFAULT_MIN_HEIGHT = 96;
const EXPANDED_MIN_HEIGHT = 560;
/** Keystrokes are batched before the frame re-runs the program. */
const SEND_DELAY_MS = 150;
/** How far outside the viewport a frame mounts. */
const FRAME_MOUNT_MARGIN = "400px 0px";
/** How far outside the viewport a mounted frame stays mounted. */
const FRAME_UNMOUNT_MARGIN = "1000px 0px";

/**
 * A component rendered from source, with the source editable in place.
 *
 * The frame transforms the code in the browser (TypeScript included), so
 * the reader can change a prop and see the result without a build step.
 * A snippet may reference any registry component the way its README does:
 * the packages it names are loaded on demand, and no others.
 *
 * The preview runs in its own document (an iframe at `/sandbox`): a modal,
 * drawer or toast portals to *that* body and covers the preview, not the
 * docs page. Catalog thumbnails are not live examples at all: they are
 * rendered to static markup at build time (see `ComponentCard`).
 */
export function LiveExample(props: LiveExampleProps) {
  return <FramedExample {...props} />;
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

  // Mount the frame only while it is near the viewport, and unmount it once it
  // scrolls well away. Every frame is a whole copy of the sandbox app (React,
  // sucrase and the packages its program uses), and WebKit spends far more
  // memory on each than Chromium: with every frame of a long page mounted, iOS
  // Safari kills the page ("A problem repeatedly occurred"). A frame mounts
  // within FRAME_MOUNT_MARGIN of the viewport and unmounts only beyond the
  // wider FRAME_UNMOUNT_MARGIN, so one that has just mounted is not dropped
  // again by a small scroll. It does not keep the page still: frames above a
  // figure still grow as they size to their content and can move it. The last
  // reported height is kept, so the page does not jump when a frame unmounts;
  // an edit is kept in `code` and sent again when the frame comes back.
  useEffect(() => {
    const element = figureRef.current;
    if (!element) return;
    const near = (entries: IntersectionObserverEntry[]) =>
      entries.some((entry) => entry.isIntersecting);
    const mount = new IntersectionObserver(
      (entries) => {
        if (near(entries)) setVisible(true);
      },
      { rootMargin: FRAME_MOUNT_MARGIN },
    );
    const unmount = new IntersectionObserver(
      (entries) => {
        if (!near(entries)) {
          setVisible(false);
          setReady(false);
        }
      },
      { rootMargin: FRAME_UNMOUNT_MARGIN },
    );
    mount.observe(element);
    unmount.observe(element);
    return () => {
      mount.disconnect();
      unmount.disconnect();
    };
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
  const frameTitle = title ? `${title} — live preview` : "Live preview";
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
          <CodeEditor
            code={code}
            onChange={setCode}
            className={getChildClass("editor-inner")}
          />
        </div>
      )}
    </figure>
  );
}
