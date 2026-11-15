---
title: Standards
description: The naming, props, styling and testing rules every component in this registry follows.
order: 3
---

# Standards

The rules every component in this registry follows. Keep this page short enough that people read it — and edit it: it is yours.

## Naming

- Package folders and files are kebab-case (`date-picker`); the component itself is PascalCase (`DatePicker`); its props interface is `DatePickerProps`.
- One exported component per package. Helpers stay un-exported or live in `index.ts`.

## Props

- Every public prop has a one-line JSDoc comment — it becomes the props table on the site.
- Prefer a small set of semantic props (`variant`, `size`, `disabled`) over booleans for every visual tweak.
- Accept `className` and spread the rest onto the root element, so a consumer can always reach the DOM attributes.

## Styling

- Every component names its classes through `getClassName` from `@behivetech/bht-class-names`, BEM-style: the root element carries the block class, every inner element a `__child` class, and variants are `--modifier` classes on the root only. The generator writes this for you:

  ```tsx
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ACME__DatePicker",
    styles,
    className,
    modifiers: { open },
  });
  <div className={rootClass}>
    <span className={getChildClass("label")} />
  </div>;
  ```

  and the stylesheet mirrors it: `.ACME__DatePicker { &__label {} &--open {} }`. No bare `styles.foo` and no hand-written class strings.

- A modifier is written one way. The root's own properties go in `&.ACME__DatePicker { … }` and the children it changes go in `.ACME__DatePicker { &__child { … } }`, both directly inside the modifier block, and nothing else sits there:

  ```scss
  .ACME__DatePicker {
    &__label {
      color: var(--md-sys-color-on-surface-variant);
    }

    &--open {
      &.ACME__DatePicker {
        border-color: var(--md-sys-color-primary);
      }

      .ACME__DatePicker {
        &__label {
          color: var(--md-sys-color-primary);
        }
      }
    }
  }
  ```

  Never `&--open &__label`, `&--open { .ACME__DatePicker__label {} }` or a declaration directly in `&--open`. One block per modifier. The Components guide ("Modifiers in the stylesheet") explains the shape.

- Each component has its own `.module.scss`, and it styles its own component only. To change how a child component looks inside yours, give it a prop or pass it a `className` and style that class in your file. Never target its classes from your file, and never `@use` its stylesheet (the one packaging exception is in the Components guide, "One stylesheet per component").
- `pnpm check:scss` checks the two rules above on every `.module.scss` outside `docs-history`, on commit and in CI. The other rules in this section are checked in review.
- A state the DOM already expresses (`aria-current`, `aria-expanded`, `disabled`) is styled from that attribute, not a second class.
- Colour, spacing and type come from the design tokens (`--md-sys-*`), never from literal values, so a theme change reaches every component.

## Examples

Every visual state has a named export in `*.example.tsx`. A fenced `jsx live` block in any docs page renders live with the whole registry in scope, so a standard can show itself:

```jsx live
<button type="button">Primary action</button>
```

## Testing

- A spec per component covers what it renders and how it behaves on interaction — not how it looks.
- Tests use roles and labels (`getByRole`, `getByLabelText`), not class names.
