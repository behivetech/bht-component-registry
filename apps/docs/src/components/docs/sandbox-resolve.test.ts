import { describe, expect, it } from "vitest";
import {
  analyzeProgram,
  resolvePackages,
  stylePackages,
} from "./sandbox-resolve";

const INDEX = {
  Card: "@example/atoms.card",
  ImageCard: "@example/molecules.image-card",
  Modal: "@example/atoms.modal",
  Icon: "@example/atoms.icon",
  Button: "@example/atoms.button",
  Badge: "@example/atoms.badge",
  TextField: "@example/atoms.text-field",
  Select: "@example/atoms.select",
  FormFieldManaged: "@example/forms.form-field-managed",
  useImageStatus: "@example/hooks.use-image-status",
};

describe("resolvePackages", () => {
  it("finds the package of a JSX element", () => {
    expect(resolvePackages("<Button>Save</Button>", INDEX)).toEqual([
      "@example/atoms.button",
    ]);
  });

  it("finds every package a cross-package example uses", () => {
    const code = `<FormFieldManaged name="a"><TextField /><Select /><Button /></FormFieldManaged>`;
    expect(resolvePackages(code, INDEX)).toEqual([
      "@example/atoms.button",
      "@example/atoms.select",
      "@example/atoms.text-field",
      "@example/forms.form-field-managed",
    ]);
  });

  it("finds plain identifiers such as hooks and spread components", () => {
    const code = `render(() => { const s = useImageStatus("a"); return <p {...Button} />; })`;
    expect(resolvePackages(code, INDEX)).toEqual([
      "@example/atoms.button",
      "@example/hooks.use-image-status",
    ]);
  });

  it("lists a package once however often it is used", () => {
    expect(resolvePackages("<Button /><Button /><Button />", INDEX)).toEqual([
      "@example/atoms.button",
    ]);
  });

  it("ignores names in comments and quoted strings", () => {
    const code = `// Badge
/* Select */ <Button label="TextField" title='Badge' />`;
    expect(resolvePackages(code, INDEX)).toEqual(["@example/atoms.button"]);
  });

  it("ignores property accesses", () => {
    expect(resolvePackages("props.Badge + item.Select", INDEX)).toEqual([]);
  });

  it("ignores names that merely contain an export name", () => {
    expect(
      resolvePackages("<ButtonGroup /> BadgeCount $Button", INDEX),
    ).toEqual([]);
  });

  it("leaves out names no package exports", () => {
    expect(resolvePackages("<Nope /><Button />", INDEX)).toEqual([
      "@example/atoms.button",
    ]);
  });

  it("does not treat inherited object keys as exports", () => {
    expect(
      resolvePackages("constructor.toString(hasOwnProperty)", INDEX),
    ).toEqual([]);
  });

  describe("text that looks like code", () => {
    const BUTTON = "@example/atoms.button";
    const BADGE = "@example/atoms.badge";
    const CARD = "@example/atoms.card";
    const IMAGE_CARD = "@example/molecules.image-card";

    it("does not read // inside a string as a comment", () => {
      const code = `<Card><a href="https://example.com">Docs</a><Button>Go</Button></Card>`;
      expect(resolvePackages(code, INDEX)).toEqual([BUTTON, CARD]);
    });

    it("keeps names after a URL attribute, in a nested element", () => {
      const code = `<ImageCard href="https://example.com" media={<Badge>New</Badge>} />`;
      expect(resolvePackages(code, INDEX)).toEqual([BADGE, IMAGE_CARD]);
    });

    it("does not read an apostrophe in JSX text as a quote", () => {
      const code = `<p>Don't <Badge>new</Badge> it's</p>`;
      expect(resolvePackages(code, INDEX)).toEqual([BADGE]);
    });

    it('does not let accept="image/*" open a comment', () => {
      const code = `<>
        <input accept="image/*" />
        <Button>Pick</Button>
        {/* a note */}
        <Badge>done</Badge>
      </>`;
      expect(resolvePackages(code, INDEX)).toEqual([BADGE, BUTTON]);
    });

    it("reads a template literal and the expressions inside it", () => {
      const code =
        "const label = `it's ${<Badge />} // not a comment`; render(<Button>{label}</Button>)";
      expect(resolvePackages(code, INDEX)).toEqual([BADGE, BUTTON]);
    });

    it("does not read a regex with a quote in it as a string", () => {
      const code = `const quoted = /'/.test(text); render(<Button />)`;
      expect(resolvePackages(code, INDEX)).toEqual([BUTTON]);
    });

    it("skips JSX text and attribute names", () => {
      const code = `<p Badge="x">Select a Button or Modal</p>`;
      expect(resolvePackages(code, INDEX)).toEqual([]);
    });

    it("still reads names inside attribute expressions", () => {
      const code = `<p title={Badge} icon={<Icon />} />`;
      expect(resolvePackages(code, INDEX)).toEqual([
        BADGE,
        "@example/atoms.icon",
      ]);
    });

    it("takes the namespace of a dotted element name", () => {
      expect(
        resolvePackages("<Card.Header>Title</Card.Header>", INDEX),
      ).toEqual([CARD]);
    });

    it("does not take a comparison for JSX", () => {
      const code = `const small = count < Limit && other > 1; render(<Button />)`;
      expect(resolvePackages(code, INDEX)).toEqual([BUTTON]);
    });
  });

  describe("names the program declares", () => {
    it("leaves out a component the program defines itself", () => {
      const code = `const Button = () => <b>mine</b>; render(<Button />)`;
      expect(resolvePackages(code, INDEX)).toEqual([]);
      expect(analyzeProgram(code).declarations.has("Button")).toBe(true);
    });

    it("leaves out function and class declarations", () => {
      const code = `function Badge() { return null } class Select {} render(<Badge />)`;
      expect(resolvePackages(code, INDEX)).toEqual([]);
    });

    it("leaves out destructured names, and still reads their defaults", () => {
      const code = `const { Button, tone: Badge = Select } = parts; render(<Button />)`;
      expect(analyzeProgram(code).declarations).toEqual(
        new Set(["Button", "Badge"]),
      );
      expect(resolvePackages(code, INDEX)).toEqual(["@example/atoms.select"]);
    });

    it("reads array patterns", () => {
      const code = `const [Button, [Badge]] = parts;`;
      expect(analyzeProgram(code).declarations).toEqual(
        new Set(["Button", "Badge"]),
      );
    });

    it("ignores declarations inside a function, which do not collide", () => {
      const code = `const Row = () => { const Button = 1; return <Button /> }; render(<Row />)`;
      expect(resolvePackages(code, INDEX)).toEqual(["@example/atoms.button"]);
    });
  });

  it("resolves code the reader typed into the editor", () => {
    expect(resolvePackages("<Badge>", INDEX)).toEqual(["@example/atoms.badge"]);
  });
});

describe("stylePackages", () => {
  const DEPENDENCIES = {
    "@example/molecules.confirm-dialog": [
      "@example/atoms.button",
      "@example/atoms.modal",
    ],
    "@example/atoms.modal": ["@example/atoms.button", "@example/atoms.card"],
  };

  it("adds what a package uses, transitively, in sorted order", () => {
    expect(
      stylePackages(["@example/molecules.confirm-dialog"], DEPENDENCIES),
    ).toEqual([
      "@example/atoms.button",
      "@example/atoms.card",
      "@example/atoms.modal",
      "@example/molecules.confirm-dialog",
    ]);
  });

  it("keeps a package with no dependencies as it is", () => {
    expect(stylePackages(["@example/atoms.badge"], DEPENDENCIES)).toEqual([
      "@example/atoms.badge",
    ]);
  });

  it("lists a package once when two packages share it", () => {
    expect(
      stylePackages(
        ["@example/atoms.modal", "@example/atoms.button"],
        DEPENDENCIES,
      ),
    ).toEqual([
      "@example/atoms.button",
      "@example/atoms.card",
      "@example/atoms.modal",
    ]);
  });

  it("survives a dependency cycle", () => {
    expect(stylePackages(["a"], { a: ["b"], b: ["a"] })).toEqual(["a", "b"]);
  });
});
