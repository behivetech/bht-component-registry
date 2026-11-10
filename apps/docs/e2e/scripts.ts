import type { Frame, Page, Response } from "@playwright/test";

/** One script a page or one of its frames fetched. */
export interface FetchedScript {
  url: string;
  /** Uncompressed size in bytes. */
  bytes: number;
  text: string;
  /** Whether the page's own document asked for it, not one of its frames. */
  inMainFrame: boolean;
}

/**
 * Records the scripts a page, frames included, requests.
 *
 * Each body is requested as its response arrives and awaited only when the
 * returned function is called, after the test has waited for what it expects
 * on screen. A body can no longer be read once its page navigated away, so it
 * cannot be left until the end; a script whose body is gone is skipped.
 */
export const collectScripts = (page: Page) => {
  const pending: { response: Response; body: Promise<Buffer | null> }[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script" && response.ok()) {
      pending.push({ response, body: response.body().catch(() => null) });
    }
  });
  const mainFrame: Frame = page.mainFrame();
  return async (): Promise<FetchedScript[]> => {
    const scripts: FetchedScript[] = [];
    for (const { response, body } of pending) {
      const bytes = await body;
      if (bytes) {
        scripts.push({
          url: response.url(),
          bytes: bytes.length,
          text: bytes.toString("utf8"),
          inMainFrame: response.frame() === mainFrame,
        });
      }
    }
    return scripts;
  };
};

/** The total uncompressed size of scripts, counting each file once. */
export const totalBytes = (scripts: FetchedScript[]): number =>
  [...new Map(scripts.map((script) => [script.url, script.bytes]))].reduce(
    (sum, [, bytes]) => sum + bytes,
    0,
  );

/**
 * A string only one registry package's build carries: its root class, which
 * the generated class prefix makes unique to the package. A chunk holding it
 * is that package's code, whatever its hashed file name.
 */
export const packageMarker = (pascalName: string): string =>
  `ACME__${pascalName}`;

/** A string only sucrase (the transformer a frame runs programs with) carries. */
export const SUCRASE_MARKER = "jsxPragma";

/** A string only the code editor's highlighter theme carries. */
export const EDITOR_MARKER = "#011627";

export const anyScriptHas = (scripts: FetchedScript[], marker: string) =>
  scripts.some(({ text }) => text.includes(marker));
