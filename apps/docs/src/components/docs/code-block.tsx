import { Highlight, themes, type Language } from "prism-react-renderer";
import { getClassName } from "@behivetech/bht-class-names";
import styles from "./code-block.module.scss";

/**
 * A highlighted block of code, tokenised when the site is built.
 *
 * A server component on purpose: the highlighter runs in Node during the
 * static export and the page gets plain markup, so no highlighter code reaches
 * the browser. Code a reader types (the theme builder's export) cannot be
 * known at build time; that is `PlainCodeBlock`.
 */
export function CodeBlock({
  code,
  language = "tsx",
  title,
}: {
  code: string;
  language?: Language;
  title?: string;
}) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "CodeBlock",
    styles,
  });
  return (
    <div className={rootClass}>
      {title && <div className={getChildClass("title")}>{title}</div>}
      <Highlight
        code={code.replace(/\n$/, "")}
        language={language}
        theme={themes.nightOwl}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${getChildClass("pre")} ${className}`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className={getChildClass("line-number")}>{i + 1}</span>
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
