// Which stylesheets `pnpm check:scss` reads, and the exceptions it knows.

import { isAbsolute, relative, resolve } from "node:path";

// docs-history is a snapshot of released packages, written only by
// `pnpm snapshot-docs`.
const SKIPPED = /^docs-history\//;

/**
 * The packaging exception to "one stylesheet per component": a package whose
 * component renders another package's component may re-emit that package's own
 * stylesheet, unchanged and by package path, so its published styles.css works
 * alone. It never styles the other component. One-off cases only, each named
 * here by file with its reason:
 *
 *   "registry/acme/atoms/modal/modal.module.scss": [
 *     "@acme/atoms.card/card.module.scss",
 *   ],
 */
export const ALLOWED_USES = {};

/**
 * The stylesheets to check, as paths from the repo root.
 *
 * @param {{ root: string, given: string[], listAll: () => string[] }} options
 *   `given` is what the command line named (lint-staged passes absolute paths);
 *   when it names nothing, `listAll` supplies every stylesheet in the repo.
 */
export const selectStylesheets = ({ root, given, listAll }) => {
  const named = given.map((file) =>
    relative(root, isAbsolute(file) ? file : resolve(root, file)),
  );
  const candidates = given.length > 0 ? named : listAll();

  return candidates.filter(
    (file) => file.endsWith(".module.scss") && !SKIPPED.test(file),
  );
};
