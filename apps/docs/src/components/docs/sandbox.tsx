"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LiveError, LivePreview, LiveProvider } from "react-live";
import { sandboxScope } from "./sandbox-scope";
import {
  decodeSandboxHash,
  type SandboxProgram,
  type ToSandbox,
} from "./sandbox-protocol";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./sandbox.module.scss";

// The URL fragment is external state: read it through useSyncExternalStore
// so the server snapshot is empty (nothing to hydrate against) and the
// client's first render after hydration picks the program up.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash;
const readServerHash = () => "";

/**
 * The inside of a live-preview frame. It renders exactly one program: the
 * one the embedding page posts to it, or — opened on its own via "Open in
 * new tab" — the one in the URL fragment. Overlays mount in THIS document,
 * so a modal covers the preview and nothing else.
 */
export function Sandbox() {
  const hash = useSyncExternalStore(subscribeToHash, readHash, readServerHash);
  const fromHash = useMemo(() => decodeSandboxHash(hash), [hash]);
  const [posted, setPosted] = useState<SandboxProgram | null>(null);
  const program = posted ?? fromHash;

  useEffect(() => {
    // Lets the global stylesheet drop the page chrome (body margin, background).
    document.documentElement.dataset.sandbox = "";

    const onMessage = (event: MessageEvent<ToSandbox>) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== "bht-sandbox:code"
      )
        return;
      setPosted({ code: event.data.code, noInline: event.data.noInline });
      if (event.data.theme)
        document.documentElement.dataset.theme = event.data.theme;
      else delete document.documentElement.dataset.theme;
    };
    window.addEventListener("message", onMessage);

    const embedded = window.parent !== window;
    if (embedded)
      window.parent.postMessage(
        { type: "bht-sandbox:ready" },
        window.location.origin,
      );

    return () => window.removeEventListener("message", onMessage);
  }, []);

  // The page sizes the frame to its content, so there is never an inner
  // scrollbar: report every change in content height. Measured on the body,
  // not the root element: the root's scrollHeight is never less than the
  // viewport the page gave the frame, so it could grow but never shrink.
  useEffect(() => {
    if (window.parent === window) return;
    const report = () =>
      window.parent.postMessage(
        { type: "bht-sandbox:height", height: document.body.scrollHeight },
        window.location.origin,
      );
    const observer = new ResizeObserver(report);
    observer.observe(document.body);
    report();
    return () => observer.disconnect();
  }, [program]);

  if (!program) return null;

  const [rootClass, getChildClass] = getClassName({
    rootClass: "Sandbox",
    styles,
  });
  return (
    <LiveProvider
      code={program.code}
      scope={sandboxScope}
      noInline={program.noInline}
      language="tsx"
    >
      <div className={rootClass}>
        <LivePreview />
        <LiveError className={getChildClass("error")} />
      </div>
    </LiveProvider>
  );
}
