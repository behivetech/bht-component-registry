import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { LiveExample } from "./live-example";
import { snippetToLiveCode } from "./snippet";
import styles from "./markdown.module.scss";

export interface MarkdownProps {
  children: string;
  /**
   * Which ```jsx / ```tsx fences run live. READMEs run every one — their
   * snippets are written for the sandbox. Docs pages opt in per fence with
   * ```jsx live, so a page can show code without executing it.
   */
  liveFences?: "all" | "opt-in";
  /** Rewrites a link's href; return null to leave it as written. */
  resolveLink?: (href: string) => string | null;
}

/**
 * Markdown rendering: ```jsx / ```tsx blocks become live, editable examples
 * (every one for a README, the ones marked `live` for a docs page); other
 * code blocks are highlighted.
 */
export function Markdown({ children, liveFences = "all", resolveLink }: MarkdownProps) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // react-markdown wraps fenced code in <pre><code>; taking over <pre>
          // lets a live example replace the whole block rather than nest in it.
          pre: ({ children }) => <>{children}</>,
          code: ({ node, className, children }) => {
            const language = /language-(\w+)/.exec(className ?? "")?.[1];
            const source = String(children);
            if (!language) return <code>{source}</code>;
            const meta = String((node?.data as { meta?: unknown } | undefined)?.meta ?? "");
            const runnable = language === "jsx" || language === "tsx";
            if (runnable && (liveFences === "all" || /\blive\b/.test(meta))) {
              const live = snippetToLiveCode(source);
              return <LiveExample code={live.code} noInline={live.noInline} className={styles.example} />;
            }
            return <CodeBlock code={source} language={language === "sh" ? "bash" : (language as "bash")} />;
          },
          // Only the attributes a Markdown link can carry: spreading the rest
          // would put react-markdown's `node` (a hast element) on the DOM.
          a: ({ href, title, children }) => (
            <a href={href && resolveLink ? (resolveLink(href) ?? href) : href} title={title}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
