import * as React from "react";
import { transform } from "sucrase";
import type { SandboxScope } from "./sandbox-base-scope";

/** Why a program cannot run without a `render(...)` call. */
const NO_RENDER_MESSAGE = "No-Inline evaluations must call `render`.";
const BAD_RENDER_MESSAGE = "`render` must be called with valid JSX.";
const CALLS_RENDER = /render\s*\(/;

type Transform = "jsx" | "typescript" | "imports";

/** Sucrase with the options every program uses: production JSX, no dev-only helpers. */
const compile = (code: string, transforms: Transform[]): string =>
  transform(code, { transforms, production: true }).code;

const trimCode = (code: string): string => code.trim().replace(/;$/, "");

/**
 * Turns a program into a function body.
 *
 * An inline program is one JSX expression, so it is wrapped in a `return`
 * after its leading types and interfaces have been left alone (the two passes
 * keep a `type` statement out of the `return`). A `noInline` program is a
 * script that ends in `render(...)`. Sucrase does the TypeScript and JSX, and
 * turns `import` lines into the reads the function body can run.
 *
 * @param code the program source
 * @param noInline whether the program calls `render(...)` itself
 * @returns JavaScript that `new Function` can run
 */
export const compileProgram = (code: string, noInline: boolean): string => {
  let body: string;
  if (noInline) {
    body = compile(code, ["jsx", "typescript", "imports"]);
  } else {
    const firstPass = compile(`return (${trimCode(code)})`, [
      "jsx",
      "typescript",
    ]);
    body = compile(trimCode(firstPass), ["imports"]);
  }
  return body;
};

/** Callbacks a running program reports to: a result, or the reason it failed. */
export interface ProgramHandlers {
  /** An element to show. A `noInline` program may call this more than once. */
  onElement: (element: React.ReactElement | null) => void;
  onError: (error: Error) => void;
}

const toElement = (value: unknown): React.ReactElement | null => {
  let element: React.ReactElement | null = null;
  if (typeof value === "function") {
    element = React.createElement(value as React.ComponentType);
  } else if (React.isValidElement(value)) {
    element = value;
  }
  return element;
};

/**
 * Runs a program against a scope and reports what it renders.
 *
 * The same contract react-live gave the sandbox, without react-live: an inline
 * program yields its expression (an element, or a component to render); a
 * `noInline` program gets a `render` function, may call it later, and fails if
 * it never mentions it or calls it with nothing. A throw while compiling or
 * running goes to `onError`.
 *
 * @param program the source and whether it is `noInline`
 * @param scope the names the program may use without importing them
 * @param handlers where the element or the error goes
 */
export const runProgram = (
  program: { code: string; noInline: boolean },
  scope: SandboxScope,
  { onElement, onError }: ProgramHandlers,
): void => {
  const { code, noInline } = program;
  const render = (element?: unknown) => {
    if (typeof element === "undefined") {
      onError(new SyntaxError(BAD_RENDER_MESSAGE));
    } else {
      onElement(toElement(element));
    }
  };
  try {
    if (noInline && !CALLS_RENDER.test(code)) {
      throw new SyntaxError(NO_RENDER_MESSAGE);
    }
    const names = { React, ...scope, ...(noInline ? { render } : {}) };
    const keys = Object.keys(names);
    const result: unknown = new Function(
      ...keys,
      compileProgram(code, noInline),
    )(...keys.map((key) => (names as SandboxScope)[key]));
    if (!noInline) {
      onElement(toElement(result));
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
};
