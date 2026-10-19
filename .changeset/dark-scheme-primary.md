---
"create-bht-component-registry": patch
---

Template: a configured `site.primaryColor` no longer breaks the dark scheme. The site used the light scheme's colour as the dark primary and left the dark label on it, about 2:1 with the default colour, and the same colour as link and outlined-button text on dark surfaces, under 3:1. The dark scheme now derives a lighter primary and a dark label from the configured colour in OKLCH (6:1 or better on each other, 8:1 on the surfaces); without a configured colour the sheet's own pair applies as before. The Scopes guide says which colour to pick, and the e2e suite measures the contrast in both schemes.
