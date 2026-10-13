---
title: Design links
description: Point a component at its design — a Figma frame or any URL — and show it on a Design tab.
order: 9
---

# Design links

A component's design lives somewhere else: a Figma frame, a Penpot file, a PDF of the spec. A registry can say where, per component, and the site shows it on a **Design** tab next to the code.

## Declaring a link

It is a field in the component's `package.json`, beside status and tags — declared, not pasted into a README, so it travels with the published package and `update` never touches it:

```json
{
  "registry": {
    "status": "stable",
    "tags": ["commerce"],
    "design": [
      { "label": "Figma", "url": "https://www.figma.com/design/AbC123/Design-System?node-id=12-345" },
      { "label": "Spec (PDF)", "url": "https://example.test/specs/price-tag.pdf" }
    ]
  }
}
```

`pnpm gen component` asks for one Figma URL as its last prompt (answer `none` for none — it is the default); add more by editing the file. Any `http(s)` URL is accepted.

Copy a Figma URL **with the frame selected**: the `node-id` in the URL is what makes the link — and the embed — open on that frame rather than the whole file.

## What the site shows

- The **Design** tab appears on a component only when it has at least one link.
- Every link is a card with its label and an *Open* button.
- A **Figma** link can also be shown as an embedded frame (Figma's Embed Kit, with the `node-id` carried over). That is a third-party iframe, and the Figma file has to be visible to whoever views the site, so it is **off by default**:

```json
{ "site": { "embedDesigns": true } }
```

in `registry.config.json` turns it on for the whole site. Links to anything other than Figma are always cards.

## The design-system file

The registry as a whole can point at its design-system file:

```json
{ "site": { "design": { "label": "Design system", "url": "https://www.figma.com/design/AbC123/Design-System" } } }
```

The design-tokens page then links to it (as *Variables in Figma* when it is a Figma URL), so the tokens and their source sit side by side.

## Related

- [Components](components.md)
- [Design tokens](design-tokens.md)
- [Terms](terms.md) — embedded third-party content is covered under *Privacy*
