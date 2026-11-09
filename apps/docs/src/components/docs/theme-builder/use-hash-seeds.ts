"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ThemeSeeds } from "@/lib/theme/scheme";
import { parseTheme, serializeTheme } from "@/lib/theme/url-state";

/**
 * The URL fragment as the builder's store. The fragment is the state (so a
 * theme is a link), React reads it through useSyncExternalStore, and writes
 * go through `history.replaceState` plus a notification — replaceState fires
 * no event of its own. On the server the snapshot is empty, so the first
 * render shows the fallback seeds and the client re-renders from the URL.
 */
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
};

const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => "";

export function useHashSeeds(
  fallback: ThemeSeeds,
): [ThemeSeeds, (update: (prev: ThemeSeeds) => ThemeSeeds) => void] {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const seeds = parseTheme(hash) ?? fallback;
  const setSeeds = useCallback(
    (update: (prev: ThemeSeeds) => ThemeSeeds) => {
      const current = parseTheme(window.location.hash) ?? fallback;
      const next = update(current);
      window.history.replaceState(null, "", `#${serializeTheme(next)}`);
      for (const listener of listeners) listener();
    },
    [fallback],
  );
  return [seeds, setSeeds];
}
