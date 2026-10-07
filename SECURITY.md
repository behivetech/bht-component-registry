# Security

## Reporting a vulnerability

Please report security issues privately through GitHub's private vulnerability reporting on this repository: open the Security tab and choose "Report a vulnerability", or go to https://github.com/behivetech/bht-component-registry/security/advisories/new. Do not open a public issue for a security problem.

Include what you found, how to reproduce it and which version or commit you tested. You will get an acknowledgement within a few days and a fix or a plan as soon as we have one. We will credit you in the advisory unless you ask us not to.

If you cannot use GitHub, contact Behive Tech through https://platform.behivetech.com.

## What this project does and does not handle

The registry template is a static site generator and a set of build tools. It has no server, no authentication, no database and no runtime secrets. A deployed site is a folder of HTML, CSS and JavaScript.

The only secrets involved anywhere are publish tokens and an optional registry read token, which live in your CI secrets or your shell and are never written to the repo. `registry.config.json` is committed and contains nothing secret. The CI workflow checks that the lockfile points at no private registry.

Things that are in scope for a report:

- the generated site executing untrusted content in an unexpected way (README and composition code is trusted repo content, as in any docs site, but the sandbox should not reach outside the page);
- the `create` or `update` CLI writing outside the target directory, or touching paths it promises not to;
- the generator writing files from untrusted input;
- dependencies with known vulnerabilities that affect the built output or the CLI.

Out of scope: vulnerabilities in your own components or in the hosting platform you deploy to.

## Supported versions

The latest release of the template and the latest published `create-bht-component-registry` receive fixes. Run `npx create-bht-component-registry update` to bring a registry up to date; see [docs/updating.md](docs/updating.md).
