"use client";

import {
  Component,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { runProgram } from "./sandbox-run";
import { useSandboxScope, type LoadedProgram } from "./use-sandbox-scope";
import {
  decodeSandboxHash,
  type SandboxProgram,
  type ToSandbox,
} from "./sandbox-protocol";
import { getClassName } from "@behivetech/bht-class-names";
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

/** Catches a throw while the program's element renders and reports it. */
class PreviewBoundary extends Component<
  { onError: (error: Error) => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/**
 * Runs one loaded program and shows what it renders, or why it failed.
 *
 * Sucrase compiles the program directly (see `runProgram`): the frame needs no
 * editor, highlighter or provider, so none of that code is in it.
 */
function Preview({
  program,
  errorClass,
}: {
  program: LoadedProgram;
  errorClass: string;
}) {
  const [element, setElement] = useState<ReactElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    runProgram(program, program.scope, {
      onElement: (next) => {
        if (current) {
          setError(null);
          setElement(next);
        }
      },
      onError: (failure) => {
        if (current) {
          setElement(null);
          setError(failure.toString());
        }
      },
    });
    return () => {
      current = false;
    };
  }, [program]);

  return (
    <>
      {/* A new program is a new boundary, so one error does not outlive its code. */}
      <PreviewBoundary
        key={program.code}
        onError={(failure) => setError(failure.toString())}
      >
        <div>{element}</div>
      </PreviewBoundary>
      {error && <pre className={errorClass}>{error}</pre>}
    </>
  );
}

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
  // Only the registry packages this program references are loaded, here, in
  // this frame: a frame never pulls in the whole library.
  const { program: loaded, error } = useSandboxScope(program);

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

  if (!program || (!loaded && !error)) return null;

  const [rootClass, getChildClass] = getClassName({
    rootClass: "Sandbox",
    styles,
  });
  return (
    <div className={rootClass}>
      {loaded && (
        <Preview program={loaded} errorClass={getChildClass("error")} />
      )}
      {error && (
        <pre role="alert" className={getChildClass("error")}>
          {error}
        </pre>
      )}
    </div>
  );
}
