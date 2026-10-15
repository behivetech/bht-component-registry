/**
 * The contract between a docs page and the preview frame it embeds.
 *
 * Live examples render inside an iframe pointed at `/sandbox` so that a
 * component which portals to `document.body` or positions itself `fixed` —
 * a modal, a drawer, a toast — takes over the preview, not the docs page.
 * The page sends the program in; the frame reports its height back. Both
 * sides check the origin, so nothing crosses an origin boundary.
 */
export const SANDBOX_PATH = "/sandbox";

export interface SandboxProgram {
  /** react-live source. In `noInline` mode it ends with `render(...)`. */
  code: string;
  noInline: boolean;
  /** A forced site theme (`data-theme` on the docs page), mirrored into the frame. */
  theme?: string | null;
}

/** Page → frame. */
export type ToSandbox = { type: "bht-sandbox:code" } & SandboxProgram;

/** Frame → page. */
export type FromSandbox =
  | { type: "bht-sandbox:ready" }
  | { type: "bht-sandbox:height"; height: number };

/**
 * "Open in new tab" carries the program in the URL fragment: a fragment is
 * never sent to the server, so it works on any static host and costs the
 * sandbox page nothing — it doesn't need the catalog to look anything up.
 */
export function encodeSandboxHash(program: SandboxProgram): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ code: program.code, noInline: program.noInline }));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSandboxHash(hash: string): SandboxProgram | null {
  const encoded = hash.replace(/^#/, "");
  if (!encoded) return null;
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SandboxProgram>;
    if (typeof parsed.code !== "string") return null;
    return { code: parsed.code, noInline: Boolean(parsed.noInline) };
  } catch {
    return null;
  }
}
