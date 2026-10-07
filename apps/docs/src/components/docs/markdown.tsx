import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { LiveExample } from "./live-example";
import { snippetToLiveCode } from "./snippet";
import styles from "./markdown.module.scss";

/**
 * README rendering, bit.dev style: every ```jsx / ```tsx block becomes a
 * live, editable example; other code blocks are highlighted.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // react-markdown wraps fenced code in <pre><code>; taking over <pre>
          // lets a live example replace the whole block rather than nest in it.
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const language = /language-(\w+)/.exec(className ?? "")?.[1];
            const source = String(children);
            if (!language) return <code>{source}</code>;
            if (language === "jsx" || language === "tsx") {
              const live = snippetToLiveCode(source);
              return <LiveExample code={live.code} noInline={live.noInline} className={styles.example} />;
            }
            return <CodeBlock code={source} language={language === "sh" ? "bash" : (language as "bash")} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
