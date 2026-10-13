---
title: The expanded version
description: What the expanded version adds on top of this registry, and how to get it.
order: 14
---

# The expanded version

This registry is complete on its own: components in git, docs generated from source, versions through Changesets, a static site anyone can host. The expanded version keeps all of that exactly as it is and layers a workspace for the people who maintain the registry on top of it.

## What it adds

- **A dashboard** for the team, next to the public docs: sign in, see every component in your scope, and curate it without editing JSON by hand.
- **Status, tags and descriptions edited in place.** The same `status` and `tags` this registry reads from each `package.json`, plus a display name and description override, changed from a form and reflected on the public pages.
- **Roles.** Everyone in the organisation can author; deprecating a component or renaming the scope needs an admin. The rule is one permission table, checked on the server and mirrored in the UI.
- **An audit log**: who changed what, when, per scope.
- **Sign-in with SSO**, through an identity provider your organisation already has, with organisations mapping to scopes.
- **Scaffolding from the browser** on a development machine: the same generator this registry uses, run from a form.

## How it fits

The expanded version is a layer, not a replacement:

- **Standard keeps working unchanged underneath.** Your `registry/` folders, `registry.config.json`, Changesets flow and static docs are untouched; the expanded version imports the same engine the standard site renders with.
- **It runs on your infrastructure.** Your hosting, your database, your identity provider. Nothing of yours is sent to anyone else to run.
- **Turning it off costs nothing.** Remove the layer and you are back to this registry, with every component and page exactly where it was.

## Getting it

The expanded version is set up and configured for your team by Behive Tech as a consulting engagement: installation on your infrastructure, SSO wired to your provider, your existing components and metadata carried over, and a session for the people who will maintain it. Ask at [behivetech.com](https://platform.behivetech.com).

Engagements, support and updates for the expanded version are governed by a separate written agreement; nothing on this page or in this repository is an offer of them. See [Terms](terms.md).
