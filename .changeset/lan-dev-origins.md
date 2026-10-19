---
"create-bht-component-registry": patch
---

Docs app: `ALLOWED_DEV_ORIGINS=<host,...> pnpm dev` opens the dev server by LAN address or from another device. Next refuses dev resources from hosts it was not told about, so such a page loaded but never hydrated and showed no live examples; the guide's Getting started and FAQ pages say so.
