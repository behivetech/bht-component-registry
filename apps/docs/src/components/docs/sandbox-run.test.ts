// @vitest-environment node
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { runProgram } from "./sandbox-run";

const run = (code: string, noInline: boolean, scope = {}) => {
  const results: { html?: string; error?: string }[] = [];
  runProgram({ code, noInline }, scope, {
    onElement: (element) =>
      results.push({ html: renderToStaticMarkup(element) }),
    onError: (error) => results.push({ error: error.toString() }),
  });
  return results;
};

describe("runProgram", () => {
  it("renders an inline JSX expression, trailing semicolon included", () => {
    expect(run("<b>hi</b>;", false)).toEqual([{ html: "<b>hi</b>" }]);
  });

  it("strips TypeScript and keeps leading types out of the return", () => {
    const code = `type Props = { n: number };
const Count = ({ n }: Props) => <i>{n}</i>;
render(<Count n={3} />)`;
    expect(run(code, true)).toEqual([{ html: "<i>3</i>" }]);
  });

  it("gives the program the names in scope", () => {
    const Tag = ({ text }: { text: string }) =>
      React.createElement("em", null, text);
    expect(run('<Tag text="x" />', false, { Tag })).toEqual([
      { html: "<em>x</em>" },
    ]);
  });

  it("renders a component an inline program evaluates to", () => {
    expect(run("() => <u>fn</u>", false)).toEqual([{ html: "<u>fn</u>" }]);
  });

  it("lets a noInline program call render later, and more than once", async () => {
    const results: string[] = [];
    runProgram(
      {
        code: "setTimeout(() => render(<p>late</p>), 0); render(<p>now</p>)",
        noInline: true,
      },
      { setTimeout },
      {
        onElement: (element) => results.push(renderToStaticMarkup(element)),
        onError: () => results.push("error"),
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(results).toEqual(["<p>now</p>", "<p>late</p>"]);
  });

  it("reports a noInline program that never calls render", () => {
    expect(run("const a = 1;", true)).toEqual([
      { error: "SyntaxError: No-Inline evaluations must call `render`." },
    ]);
  });

  it("reports render called with nothing", () => {
    expect(run("render()", true)).toEqual([
      { error: "SyntaxError: `render` must be called with valid JSX." },
    ]);
  });

  it("reports a name that is not defined", () => {
    expect(run("<Missing />", false)[0]?.error).toContain("Missing");
  });

  it("reports a syntax error instead of throwing", () => {
    expect(run("<div", false)[0]?.error).toBeDefined();
  });
});
