"use client";

import { Highlight, themes, type Language } from "prism-react-renderer";
import styles from "./code-block.module.scss";

export function CodeBlock({ code, language = "tsx", title }: { code: string; language?: Language; title?: string }) {
  return (
    <div className={styles.block}>
      {title && <div className={styles.title}>{title}</div>}
      <Highlight code={code.replace(/\n$/, "")} language={language} theme={themes.nightOwl}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${styles.pre} ${className}`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className={styles.lineNumber}>{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
