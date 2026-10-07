// @vitest-environment node
import { describe, expect, it } from "vitest";
import { snippetToLiveCode } from "./snippet";

describe("snippetToLiveCode", () => {
  it("drops imports and wraps a bare expression in a fragment", () => {
    const result = snippetToLiveCode(`import { Button } from '@behivetech/atoms.button';\n\n<Button>Go</Button>;\n`);
    expect(result.noInline).toBe(false);
    expect(result.code).toBe("<>\n<Button>Go</Button>\n</>");
  });

  it("allows sibling elements", () => {
    const result = snippetToLiveCode(`<Badge>a</Badge>\n<Badge>b</Badge>`);
    expect(result.code).toContain("<Badge>a</Badge>\n<Badge>b</Badge>");
  });

  it("renders a declared component with render()", () => {
    const source = `import { Form } from "x";\n\nfunction MyForm() {\n  return <Form />;\n}\n`;
    const result = snippetToLiveCode(source);
    expect(result.noInline).toBe(true);
    expect(result.code).toContain("function MyForm()");
    expect(result.code.trim().endsWith("render(<MyForm />);")).toBe(true);
  });

  it("hoists top-level hook calls into a component", () => {
    const source = `const methods = useForm({ defaultValues: { email: "" } });\n\n<Form methods={methods}>\n  <TextField />\n</Form>;`;
    const result = snippetToLiveCode(source);
    expect(result.noInline).toBe(true);
    expect(result.code).toContain("function Example() {\nconst methods = useForm(");
    expect(result.code).toContain("<Form methods={methods}>");
    expect(result.code.trim().endsWith("render(<Example />);")).toBe(true);
  });
});
