---
name: writing-documentation
description: >-
  Guides documentation changes for honeybadger-js. Use when documenting features,
  updating READMEs, writing docs, or when a change needs user-facing documentation.
---

# Writing Documentation

## Where documentation lives

All product documentation lives in the [`honeybadger-io/docs`](https://github.com/honeybadger-io/docs) repository (Astro/Starlight, builds [docs.honeybadger.io](https://docs.honeybadger.io)).

## Do not document in this repo

Do not document new features or behavior changes in `README.md` files in `honeybadger-js`. Package READMEs cover installation and basic usage only.

## Request a docs issue instead

When a change needs user-facing documentation:

1. **Recommend** a new GitHub issue in `honeybadger-io/docs` with a proposed title and body describing what needs documenting. Link back to the source PR.
2. **Wait for explicit human approval** before creating the issue. Never create it unprompted.
3. Present the recommendation clearly so the human can approve, edit, or decline.

### Example recommendation

> **Docs issue needed** for the new `breadcrumbsSelectorAttributes` option:
>
> - **Repo:** `honeybadger-io/docs`
> - **Title:** Document `breadcrumbsSelectorAttributes` browser config option
> - **Body:** Add a section under the JS browser configuration docs describing the new `breadcrumbsSelectorAttributes` option, which lets users specify DOM attributes used to build legible `ui.click` breadcrumb selectors. Link to PR #1510.
>
> Shall I create this issue?
