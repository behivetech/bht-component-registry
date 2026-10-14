/**
 * Guide pages link to each other the way they do on GitHub —
 * `[Publishing](publishing.md)`, `../contributing.md#rules` — so the same
 * file reads in both places. On the site those become /docs routes, resolved
 * against the page that contains the link. Anything else (absolute URLs,
 * site paths, anchors) is left alone: `null` means "use the href as is".
 *
 * Kept apart from `docs.ts` so it can be unit-tested without the generated
 * docs index.
 */
export function resolveDocLink(fromSlug: string, href: string): string | null {
  const match = /^(?![a-z][a-z0-9+.-]*:|\/|#)([^#?]+?)\.md(#.*)?$/i.exec(href);
  if (!match) return null;
  const [, target, hash = ""] = match;
  const base = fromSlug.split("/").slice(0, -1);
  for (const segment of target!.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") base.pop();
    else base.push(segment);
  }
  return `/docs/${base.join("/")}${hash}`;
}
