---
name: review-before-commit
description: >-
  Mandatory AI code review before committing in honeybadger-js. Use when
  committing code, preparing a commit, or before any git commit of agent
  changes.
---

# Review Before Commit

Run this checklist before every commit. Do not commit until it is complete.

## 1. Request an AI review

Get a code review of the working-tree / staged changes about to be committed:

1. **Codex CLI** (preferred): run `codex` to review the changes. If `codex` is not installed, skip to step 2.
2. **Claude** (fallback): perform a thorough code review using Claude.

Address any findings.

## 2. Present findings for human approval

Present the addressed findings to the user for a human review and approval. Do not commit until the user approves.
