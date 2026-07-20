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

## 2. Request an AI review

Before submitting, get a code review of the branch diff:

1. **Codex CLI** (preferred): run `codex` to review the changes. If `codex` is not installed, skip to step 2.
2. **Claude** (fallback): perform a thorough code review using Claude.

Address any findings before opening the PR.

## 3. PR title

Use a [Conventional Commits](https://www.conventionalcommits.org/) title with a package scope. CI validates PR titles via commitlint.

Examples: `fix(js): handle unstringifiable rejection reasons`, `feat(react): add error boundary hook`
