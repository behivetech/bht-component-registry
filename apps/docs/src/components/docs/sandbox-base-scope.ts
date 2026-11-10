import * as React from "react";

/** What a program may reference without importing it. */
export type SandboxScope = Record<string, unknown>;

/**
 * The names every program gets whether or not it uses them: React and the
 * hooks examples reach for. Registry packages are not here; they are loaded
 * per program (see `loadSandboxScope`, and the build's tile renderer).
 */
export const BASE_SCOPE: SandboxScope = {
  React,
  Fragment: React.Fragment,
  useState: React.useState,
  useEffect: React.useEffect,
  useRef: React.useRef,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useId: React.useId,
  useTransition: React.useTransition,
};
