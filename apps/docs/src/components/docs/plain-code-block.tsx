import { getClassName } from "@behivetech/bht-class-names";
import styles from "./code-block.module.scss";

/**
 * `CodeBlock`'s look without its highlighter, for code that exists only in
 * the browser (the theme builder's live export). It is the same block, so it
 * shares `code-block.module.scss`; keeping it out of `code-block.tsx` keeps the
 * highlighter out of every client bundle that shows it.
 */
export function PlainCodeBlock({
  code,
  title,
}: {
  code: string;
  title?: string;
}) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "CodeBlock",
    styles,
  });
  return (
    <div className={rootClass}>
      {title && <div className={getChildClass("title")}>{title}</div>}
      <pre className={getChildClass("pre")}>
        {code
          .replace(/\n$/, "")
          .split("\n")
          .map((line, i) => (
            <div key={i}>
              <span className={getChildClass("line-number")}>{i + 1}</span>
              {line}
            </div>
          ))}
      </pre>
    </div>
  );
}
