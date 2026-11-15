import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkScss } from "./scss-conventions.mjs";

const rules = (source) => checkScss(source).map((problem) => problem.rule);
const messages = (source) =>
  checkScss(source).map((problem) => problem.message);

describe("checkScss: the accepted shape", () => {
  it("accepts the root compound and the re-opened root inside a modifier", () => {
    const source = `
      .Card {
        padding: 1rem;

        &__title {
          font-weight: 600;
        }

        &--md {
          &.Card {
            padding: 2rem;

            &:hover {
              opacity: 0.9;
            }
          }

          .Card {
            &__title {
              font-size: 2rem;
            }

            &__body {
              gap: 1rem;
            }
          }
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("accepts two modifiers together, on the root and on a child", () => {
    const source = `
      .Toggle {
        &--invalid {
          &.Toggle {
            color: red;

            &.Toggle--checked {
              background: red;

              .Toggle {
                &__thumb {
                  background: white;
                }
              }
            }
          }
        }

        &--icon-only {
          &.Toggle {
            &--sm {
              width: 2rem;
            }
          }
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("accepts a grouped modifier list and the same modifier alone", () => {
    const source = `
      .Drawer {
        &--left,
        &--right {
          &.Drawer {
            top: 0;
          }
        }

        &--left {
          &.Drawer {
            left: 0;
          }
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("accepts at-rules and an outside condition inside the modifier", () => {
    const source = `
      .Header {
        &--paired {
          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) & {
              .Header {
                &__logo {
                  display: none;
                }
              }
            }
          }

          &.Header {
            @media print {
              display: none;
            }
          }
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("leaves states alone: a pseudo-class is not a modifier", () => {
    const source = `
      .Field {
        &:focus-within:not(.Field--error) {
          .Field {
            &__label {
              color: blue;
            }
          }
        }

        &:hover {
          color: blue;
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("accepts the root re-opened under an at-rule, and keyframes", () => {
    const source = `
      .QrCard {
        display: block;
      }

      @media print {
        .QrCard {
          width: 10cm;
        }
      }

      @keyframes qr-card-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });
});

describe("checkScss: modifier nesting", () => {
  it("rejects a child on the modifier's own line", () => {
    assert.deepEqual(rules(".Card { &--md &__title { font-size: 2rem; } }"), [
      "modifier-nesting",
    ]);
  });

  it("rejects a literal child class inside the modifier", () => {
    assert.deepEqual(
      rules(".Card { &--md { .Card__title { font-size: 2rem; } } }"),
      ["modifier-nesting"],
    );
  });

  it("rejects a child appended to the modifier", () => {
    assert.deepEqual(
      rules(".Card { &--md { &__title { font-size: 2rem; } } }"),
      ["modifier-nesting"],
    );
  });

  it("rejects the re-opened root inside the root compound", () => {
    const source = `
      .Card {
        &--md {
          &.Card {
            .Card {
              &__title {
                font-size: 2rem;
              }
            }
          }
        }
      }
    `;

    assert.deepEqual(rules(source), ["modifier-nesting"]);
  });

  it("rejects a modifier written outside the root block", () => {
    assert.deepEqual(
      rules(".Card { color: red; } .Card--md .Card__title { color: blue; }"),
      ["modifier-nesting"],
    );
    assert.deepEqual(
      rules(
        '.Card { color: red; } :root[data-theme="dark"] .Card--md { color: blue; }',
      ),
      ["modifier-nesting"],
    );
  });

  it("rejects a state placed directly in the modifier", () => {
    assert.deepEqual(rules(".Card { &--md { &:hover { color: blue; } } }"), [
      "modifier-nesting",
    ]);
  });

  it("rejects the same modifier opened twice", () => {
    const source = `
      .Card {
        &--md {
          &.Card {
            padding: 2rem;
          }
        }

        &--md {
          .Card {
            &__title {
              font-size: 2rem;
            }
          }
        }
      }
    `;

    assert.match(messages(source)[0], /already open on line 3/);
  });
});

describe("checkScss: modifiers the simple forms hide", () => {
  it("reads an interpolated modifier as a modifier", () => {
    assert.deepEqual(
      rules(
        ".Grid { @for $n from 1 through 4 { &--cols-#{$n} { --cols: #{$n}; } } }",
      ),
      ["modifier-root"],
    );
    assert.deepEqual(
      checkScss(
        ".Grid { @for $n from 1 through 4 { &--cols-#{$n} { &.Grid { --cols: #{$n}; } } } }",
      ),
      [],
    );
  });

  it("rejects a state on the modifier's own line", () => {
    assert.deepEqual(rules(".Card { &--linked:hover { box-shadow: none; } }"), [
      "modifier-nesting",
    ]);
    assert.deepEqual(
      checkScss(
        ".Card { &--linked { &.Card { &:hover { box-shadow: none; } } } }",
      ),
      [],
    );
  });

  it("rejects a modifier built from #{&}", () => {
    assert.deepEqual(
      rules(".Icon { &--glow#{&}--red { box-shadow: none; } }"),
      ["modifier-nesting"],
    );
    assert.deepEqual(
      checkScss(
        ".Icon { &--glow { &.Icon--#{$accent} { box-shadow: none; } } }",
      ),
      [],
    );
  });

  it("rejects a modifier written as a compound in the root block", () => {
    assert.deepEqual(rules(".Card { &.Card--md { padding: 2rem; } }"), [
      "modifier-nesting",
    ]);
  });

  it("rejects a modifier nested in a modifier, which names no class", () => {
    assert.deepEqual(rules(".Card { &--a { &--b { color: red; } } }"), [
      "modifier-nesting",
    ]);
  });

  it("rejects declarations on the re-opened root", () => {
    assert.deepEqual(rules(".Card { &--md { .Card { color: red; } } }"), [
      "modifier-nesting",
    ]);
  });

  it("counts declarations inside an at-rule or an outside condition", () => {
    const direct = [
      ".Card { &--md { @media print { padding: 0; } } }",
      ".Card { &--md { @include bp.md { padding: 0; } } }",
      '.Card { &--md { :root[data-theme="dark"] & { color: red; } } }',
    ];

    for (const source of direct) {
      assert.deepEqual(rules(source), ["modifier-root"], source);
    }
  });

  it("accepts only children in the re-opened root", () => {
    const stray = [
      ".R { &--m { .R { &:hover { color: red; } } } }",
      ".R { &--m { .R { &--n { color: blue; } } } }",
      ".R { &--m { .R { .R__c { color: green; } } } }",
    ];

    for (const source of stray) {
      assert.deepEqual(rules(source), ["modifier-nesting"], source);
    }

    assert.deepEqual(
      checkScss(".R { &--m { .R { &__c:hover, &__d a { color: red; } } } }"),
      [],
    );
  });

  it("rejects a child reached past a negated modifier", () => {
    assert.deepEqual(rules(".R { &:not(.R--m) &__c { color: red; } }"), [
      "modifier-nesting",
    ]);
    assert.deepEqual(
      checkScss(
        ".R { &:hover:not(.R--a, .R--b, :focus-visible) { color: red; } }",
      ),
      [],
    );
  });

  it("rejects the same modifier opened again inside an at-rule", () => {
    const source =
      ".R { &--m { &.R { color: red; } } @media print { &--m { &.R { color: blue; } } } }";

    assert.match(messages(source)[0], /already open on line 1/);
  });

  it("reads // inside an unquoted url() as part of the address", () => {
    const source = `
      .R {
        background: url(https://example.com/a.png);

        &--m {
          color: red;
        }
      }
    `;

    assert.deepEqual(rules(source), ["modifier-root"]);
    assert.deepEqual(
      rules(
        ".R { &__a { background: url(//x.png) } &--m &__c { color: red; } }",
      ),
      ["modifier-nesting"],
    );
  });

  it("counts a last declaration that has no semicolon", () => {
    assert.deepEqual(rules(".Card { &--md { padding: 2rem } }"), [
      "modifier-root",
    ]);
  });

  it("does not split a selector list inside :is() or read a dot in an attribute", () => {
    const source = `
      .Card {
        &--md {
          &.Card {
            &:is(:hover, :focus-visible) {
              color: red;
            }
          }
        }

        &__link[href$=".pdf"] {
          color: blue;
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("leaves #{&} alone when it builds no modifier", () => {
    assert.deepEqual(
      checkScss(".Table { th#{&}__total { text-align: right; } }"),
      [],
    );
  });
});

describe("checkScss: the root's own properties", () => {
  it("rejects a declaration directly in the modifier", () => {
    assert.deepEqual(rules(".Card { &--md { padding: 2rem; } }"), [
      "modifier-root",
    ]);
  });

  it("rejects an @include directly in the modifier", () => {
    assert.deepEqual(rules(".Card { &--md { @include focus-edge; } }"), [
      "modifier-root",
    ]);
  });

  it("ignores comments and strings that look like rules", () => {
    const source = `
      .Card {
        // &--md &__title { nope }
        /* &--md { padding: 0; } */
        &__title {
          content: "&--md { }";
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });
});

describe("checkScss: one component per file", () => {
  it("rejects another component's class", () => {
    assert.deepEqual(
      rules(".Drawer { &__panel { .Card__body { padding: 0; } } }"),
      ["own-file"],
    );
  });

  it("rejects a file that does not start with its one class", () => {
    assert.deepEqual(
      rules(".R, .Foreign { color: red; &--m &__c { color: blue; } }"),
      ["own-file"],
    );
    assert.deepEqual(rules("div { color: red; }"), ["own-file"]);
    assert.deepEqual(checkScss(""), []);
    assert.deepEqual(checkScss("@use 'tokens';\n// nothing yet\n"), []);
  });

  it("rejects a second block in the file", () => {
    assert.deepEqual(
      rules(".Card { color: red; } .CardTitle { color: blue; }"),
      ["own-file"],
    );
  });

  it("rejects another component's stylesheet pulled in", () => {
    assert.deepEqual(
      rules('@use "@acme/atoms.card/card.module.scss"; .Modal { color: red; }'),
      ["own-file"],
    );
  });

  it("accepts a stylesheet the caller names as a packaging exception", () => {
    const source =
      '@use "@acme/atoms.card/card.module.scss"; .Modal { color: red; }';

    assert.deepEqual(
      checkScss(source, {
        allowedUses: ["@acme/atoms.card/card.module.scss"],
      }),
      [],
    );
    assert.deepEqual(
      checkScss(source, { allowedUses: ["@acme/atoms.button/x.module.scss"] })
        .length,
      1,
    );
  });

  it("accepts tokens, mixins and the root's own classes in :not()", () => {
    const source = `
      @use "@behivetech/cms.base-styles/breakpoints.scss" as breakpoints;

      .BHT__Select {
        &:hover:not(.BHT__Select--disabled, .BHT__Select--open) {
          color: blue;
        }
      }
    `;

    assert.deepEqual(checkScss(source), []);
  });

  it("accepts a class a third-party library sets at runtime", () => {
    assert.deepEqual(
      checkScss(
        ".Editor { &__content { :global(.ProseMirror-selectednode) { outline: 1px solid; } } }",
      ),
      [],
    );
  });

  it("reports the line of the problem", () => {
    const [problem] = checkScss(
      ".Card {\n  color: red;\n\n  &--md &__title {\n    color: blue;\n  }\n}\n",
    );

    assert.equal(problem.line, 4);
  });
});
