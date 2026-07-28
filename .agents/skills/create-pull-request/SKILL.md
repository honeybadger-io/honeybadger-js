---
name: create-pull-request
description: >-
  Pre-submission checklist for opening pull requests in honeybadger-js. Use when
  creating, submitting, or opening a pull request, or when the user asks to
  prepare a PR for review.
---

# Create Pull Request

Run this checklist before opening a pull request.

## 1. Remove planning artifacts

Delete any agent-generated spec, plan, or implementation-notes markdown files from the branch (e.g. `PLAN.md`, `IMPLEMENTATION.md`, `.cursor/plans/*.md`).

Move the essential spec content into the PR description instead — reviewers should not need to hunt for planning files in the diff.

## 2. AI review

Commits on the PR branch must already have gone through the [`review-before-commit`](../review-before-commit/SKILL.md) skill. If any uncommitted changes remain, follow that skill before committing.

## 3. PR title

Use a [Conventional Commits](https://www.conventionalcommits.org/) title with a package scope. CI validates PR titles via commitlint.

Examples: `fix(js): handle unstringifiable rejection reasons`, `feat(react): add error boundary hook`
