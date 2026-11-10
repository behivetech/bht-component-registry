"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@behivetech/atoms.button";
import { getClassName } from "@bht-component-registry/class-names";
import type { ThemeSeeds } from "@/lib/theme/scheme";
import { configSnippet } from "@/lib/theme/url-state";
import { PlainCodeBlock } from "@/components/docs/plain-code-block";
import styles from "./theme-export.module.scss";

/**
 * Getting the theme out: the CSS file, the clipboard, and the `site.theme`
 * block for this registry's own config — then the three ways to use it. The
 * download is a Blob URL made from the current CSS; nothing is uploaded or
 * stored anywhere.
 */
export function ThemeExport({
  seeds,
  css,
  tokensPackage,
}: {
  seeds: ThemeSeeds;
  css: string;
  tokensPackage: string | null;
}) {
  const [copied, setCopied] = useState<"css" | "config" | null>(null);
  const snippet = useMemo(() => configSnippet(seeds), [seeds]);

  // A Blob made on click and revoked right after: nothing is uploaded or kept.
  const download = () => {
    const url = URL.createObjectURL(new Blob([css], { type: "text/css" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "theme.css";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (kind: "css" | "config") => {
    try {
      await navigator.clipboard.writeText(kind === "css" ? css : snippet);
      setCopied(kind);
    } catch {
      // Clipboard access refused (insecure context, permission): the CSS is
      // still readable in the details block below, and the download works.
      setCopied(null);
    }
  };

  const [rootClass, getChildClass] = getClassName({
    rootClass: "ThemeExport",
    styles,
  });
  const sheet = tokensPackage
    ? `${tokensPackage}/tokens.scss`
    : "@behivetech/cms.base-styles/tokens.scss";

  return (
    <section className={rootClass} aria-labelledby="theme-export">
      <h2 id="theme-export">Use it</h2>
      <div className={getChildClass("actions")}>
        <Button variant="primary" onClick={download}>
          Download theme.css
        </Button>
        <Button variant="secondary" onClick={() => copy("css")}>
          {copied === "css" ? "Copied" : "Copy CSS"}
        </Button>
        <Button variant="secondary" onClick={() => copy("config")}>
          {copied === "config" ? "Copied" : "Copy registry config"}
        </Button>
      </div>

      <ol className={getChildClass("steps")}>
        <li>
          <strong>In this registry.</strong> Paste the config block into{" "}
          <code>registry.config.json</code> under <code>site</code> and rebuild:
          the site regenerates exactly this CSS. Roles you edited by hand travel
          in <code>overrides</code>.
          <PlainCodeBlock
            code={`{\n  "site": {\n${snippet.replace(/^/gm, "  ")}\n  }\n}`}
          />
        </li>
        <li>
          <strong>In your app.</strong> Import the token sheet first, then{" "}
          <code>theme.css</code>: the sheet defines every{" "}
          <code>--md-sys-*</code> property and this file overrides the colour
          roles, so every component on the page re-themes.
          <PlainCodeBlock
            code={`// your root layout or entry file\nimport "${sheet}";\nimport "./theme.css"; // the download, committed next to it`}
          />
        </li>
        <li>
          <strong>Choosing a scheme.</strong> Do nothing and the visitor&apos;s
          OS preference picks light or dark. Set{" "}
          <code>data-theme=&quot;light&quot;</code> or{" "}
          <code>data-theme=&quot;dark&quot;</code> on <code>&lt;html&gt;</code>{" "}
          to force one; the file carries both.
        </li>
      </ol>

      <details className={getChildClass("details")}>
        <summary>The CSS</summary>
        <PlainCodeBlock code={css} />
      </details>
    </section>
  );
}
