import "@testing-library/jest-dom/vitest";

// Guarded: specs that opt into the `node` environment have no DOM globals, and
// an unguarded reference here fails the whole suite before it starts.
if (typeof Element !== "undefined") {
  // jsdom implements no Pointer Capture API. Radix primitives call these during
  // their pointer handling (Toast's swipe-to-dismiss, for one), which surfaces
  // as an uncaught "hasPointerCapture is not a function" that fails the run
  // even when every assertion passed. No-op stubs are enough: nothing under
  // test depends on capture semantics, only on the methods existing.
  for (const name of [
    "hasPointerCapture",
    "setPointerCapture",
    "releasePointerCapture",
  ] as const) {
    if (!(name in Element.prototype)) {
      Element.prototype[name] = () => false;
    }
  }

  // Also missing from jsdom. Radix Select calls it on the active option when
  // the listbox opens, so without it no test can open a Select. Guarded on
  // `typeof` rather than `in`, which narrows the prototype to `never` here
  // because lib.dom does declare the method.
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => {};
  }
}

// Likewise absent from jsdom. Radix measures with it (`use-size`, behind the
// tooltip/popover arrow), and without it mounting throws before any assertion
// runs. Nothing under test asserts on observed sizes, so a stub that never
// fires is enough.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
