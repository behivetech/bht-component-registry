---
"create-bht-component-registry": patch
---

Template: README snippets that call hooks at the top level and then render a multi-line element now run in the live preview. The setup/JSX split happened at the last line opening a tag — the closing tag of a multi-line element — so the opening tags stayed in the setup region and react-live got invalid code. It now splits at the first.
