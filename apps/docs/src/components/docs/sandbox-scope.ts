import * as React from "react";
import { registryModules } from "@/generated/registry-scope";

/**
 * Everything a live example may reference without importing it.
 *
 * Compositions and README snippets are written against package imports; the
 * catalog generator strips those, so the sandbox has to put the same names
 * in scope. Every registry package's exports go in (a composition for
 * `FormFieldManaged` uses `TextField`, `Select` and `Button` from three other
 * packages), plus the React hooks compositions reach for.
 *
 * This module is the only place the whole registry is imported at once, and
 * it's only ever loaded by the client-side sandbox — server-rendered pages
 * never pay for it.
 */
export const sandboxScope: Record<string, unknown> = {
  React,
  Fragment: React.Fragment,
  useState: React.useState,
  useEffect: React.useEffect,
  useRef: React.useRef,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useId: React.useId,
  useTransition: React.useTransition,
  ...Object.assign({}, ...Object.values(registryModules)),
};

/** The exports of ONE package, for a playground scoped to just that component. */
export const packageScope = (packageName: string): Record<string, unknown> => ({
  ...sandboxScope,
  ...(registryModules[packageName] ?? {}),
});
