# AGENTS.md

Reference for AI agents working in the `honeybadger-js` repository. Covers monorepo layout, conventions, tooling, testing, CI, and release flow.

## Repository overview

- Public Honeybadger JavaScript SDKs and build/CI plugins.
- Monorepo managed by [pnpm workspaces](https://pnpm.io/workspaces) + [Lerna](https://lerna.js.org/) (v9) in **independent** versioning mode (`lerna.json` with `"npmClient": "pnpm"`).
- All packages live under `packages/*` and publish to npm under the `@honeybadger-io/*` scope.
- Node `>= 14` for most packages (`>= 18` for `esbuild-plugin`). CI runs unit tests on Node 22 and lint/integration on Node 20; repo tooling (lerna 9) requires Node `^20.19.0 || ^22.12.0 || >=24`. Use the `packageManager` field in the root `package.json` (via Corepack) for the pinned pnpm version.
- Conventional Commits are enforced in CI via the `commitlint.yml` workflow on PR titles; release tooling derives versions and changelogs from commit messages.

## Top-level layout

```
.
├── .github/workflows/   # CI: tests, lint, commitlint, release, CDN/NPM publish
├── packages/            # All publishable packages (pnpm + Lerna workspaces)
├── scripts/             # Repo-wide helpers (e.g. clean-repo.sh)
├── pnpm-workspace.yaml  # Single source of truth for workspace package globs
├── pnpm-lock.yaml       # Lockfile (do not hand-edit)
├── lerna.json           # Independent versioning, npmClient: pnpm, release commit message
├── package.json         # Root scripts (build, test, lint, release, clean) + packageManager
├── tsconfig.base.json   # Shared TS compiler defaults (extended by packages)
├── .eslintrc            # Repo-wide ESLint config (TS + import + local rules)
├── eslint-local-rules.js# Custom rule: local-rules/no-test-imports
├── commitlint.config.js # Extends @commitlint/config-conventional
└── README.md
```

## Packages

Each package is independently versioned, has its own `package.json`, and publishes its own changelog. Inter-package deps use the `workspace:^` protocol in `dependencies`/`devDependencies` (Lerna rewrites them to real semver ranges on publish). `peerDependencies` stay as plain semver ranges.

| Package                                    | Path                          | Purpose                                                | Notable deps          |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------ | --------------------- |
| `@honeybadger-io/core`                     | `packages/core`               | Core notifier (transport-agnostic). TypeScript.        | none in-repo          |
| `@honeybadger-io/js`                       | `packages/js`                 | Universal SDK: browser + Node + AWS Lambda + Express.  | `core`                |
| `@honeybadger-io/react`                    | `packages/react`              | React error boundary + hooks.                          | peer: `js`            |
| `@honeybadger-io/vue`                      | `packages/vue`                | Vue 2/3 integration.                                   | peer: `js`            |
| `@honeybadger-io/nextjs`                   | `packages/nextjs`             | Next.js plugin (App Router + Pages Router).            | `js`, `webpack`; peer: `react` |
| `@honeybadger-io/react-native`             | `packages/react-native`       | React Native integration (iOS + Android native bits).  | `core`                |
| `@honeybadger-io/gatsby-plugin-honeybadger`| `packages/gatsby-plugin`      | Gatsby plugin (plain JS, no build step).               | `js`, `webpack`       |
| `@honeybadger-io/cloudflare`               | `packages/cloudflare`         | Cloudflare Workers integration. ESM-only.              | `core`, `js`          |
| `@honeybadger-io/webpack`                  | `packages/webpack`            | Webpack source-map upload plugin (Babel-built JS).     | `plugin-core`         |
| `@honeybadger-io/rollup-plugin`            | `packages/rollup-plugin`      | Rollup/Vite source-map upload plugin.                  | `plugin-core`         |
| `@honeybadger-io/esbuild-plugin`           | `packages/esbuild-plugin`     | esbuild source-map upload plugin.                      | `plugin-core`, `core` |
| `@honeybadger-io/plugin-core`              | `packages/plugin-core`        | Shared utilities for the build plugins above.          | none in-repo          |

Dependency rule of thumb: framework packages wrap `js`; `js` depends on `core`; build plugins share `plugin-core`.

## Standard package layout

```
packages/<name>/
├── src/              # TypeScript sources (or JS for older packages)
├── test/             # unit/  integration/  e2e/ (where applicable)
├── examples/         # Integration examples (not built or published as code)
├── dist/ or build/   # Build output (gitignored)
├── package.json
├── tsconfig.json     # extends ../../tsconfig.base.json (TS packages)
├── jest.config.js    # or jest.config.cjs
├── rollup.config.*   # if the package bundles
├── CHANGELOG.md      # generated by lerna/conventional-changelog
└── README.md
```

Source organization conventions inside `src/`:

- `index.ts` (or `<package-name>.ts`) — entry point.
- `integrations/` — framework or runtime adapters.
- `util.ts` / `helpers.ts` — shared helpers.
- Types live alongside source. Public `.d.ts` are emitted to `dist/` or `build/`.

`packages/js` is special: it ships separate browser and server entry points (`src/browser.ts`, `src/server.ts`) bundled via Rollup into `dist/browser/honeybadger.js` and `dist/server/honeybadger.js`.

## Languages and TypeScript

- **TypeScript first** for all new code. A few legacy packages (`webpack`, `gatsby-plugin`) are still JS.
- All TS packages extend `tsconfig.base.json`:
  - `target: es5`, `esModuleInterop: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `skipLibCheck: true`.
  - Note: `strict: false`, `noImplicitAny: false` at the base — individual packages may tighten.
- TS packages use **Project References** (`composite: true`, `references: [...]`). `pnpm run build` at the root must succeed before downstream packages typecheck — if you see "cannot find module" errors in TS files, build first.
- Build output dirs vary: `core` uses `build/`, most others use `dist/`. Both are gitignored and cleaned by `scripts/clean-repo.sh`.

## ESLint

- The root `.eslintrc` is the primary shared config for the repo; run repo-wide linting from the root with `pnpm run lint`. Some subdirectories, especially under `examples/`, also include local `.eslintrc.json` overrides.
- Extends `eslint:recommended`, `@typescript-eslint/recommended`, `import/errors`, `import/warnings`, `import/typescript`.
- Style rules to respect:
  - **Single quotes** (escape-aware).
  - **2-space indent**.
  - `object-curly-spacing: always` (i.e. `{ foo }`, not `{foo}`).
  - `no-var`.
  - Unused vars error unless prefixed with `_`.
- Custom rule `local-rules/no-test-imports` (defined in `eslint-local-rules.js`): source files under `src/` may not import test files (`*.spec.*`, `*.test.*`) or test-only modules (anything with `jest` in the name, e.g. `jest-fetch-mock`). The autofix removes the offending import.
- `.eslintignore` excludes `dist/`, `build/`, `tmp/`, `index.d.ts`, `test/integration/`, the Next.js example apps, and the bundled chrome-extension vendor file.

## Testing

Most packages use **Jest with `ts-jest`**. The exceptions are intentional and listed below.

| Package           | Runner   | Notes                                                                |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `core`            | Jest     | Node env.                                                            |
| `js`              | Jest + Playwright | `pnpm test` runs browser (jsdom) + server (node) + `tsd` type tests. `pnpm run test:integration` runs Playwright E2E (uses BrowserStack in CI). |
| `react`           | Jest     | jsdom + `@testing-library/react`.                                    |
| `vue`             | Jest     | jsdom + `@vue/test-utils`. Also runs `tsd`.                          |
| `nextjs`          | Jest     |                                                                       |
| `react-native`    | Jest     | babel-jest preset.                                                    |
| `cloudflare`      | Jest     | uses `jest.config.cjs` (package is `"type": "module"`).              |
| `esbuild-plugin`  | Jest     |                                                                       |
| `webpack`         | **Mocha**| chai + sinon. Legacy.                                                |
| `rollup-plugin`   | **Mocha**| chai + testdouble.                                                    |
| `plugin-core`     | **Mocha**| chai + testdouble.                                                    |
| `gatsby-plugin`   | _none_   | No tests; plain JS shim around `js` + `webpack` plugin.              |

Conventions:
- Test files: `*.test.ts` / `*.test.js` (Jest packages); Mocha packages follow their own globs in `.mocharc`/script config.
- `test/` typically splits into `unit/`, `integration/`, and `e2e/` (where applicable).
- Browser-vs-server splits in `packages/js`: file naming `*.browser.test.ts` runs only in jsdom; `*.server.test.ts` only in node. The Jest scripts use `--testPathPattern` regex with negative lookbehind to enforce this — keep that naming.
- Mocking: `sinon` for stubs/spies in Jest packages; `testdouble` in the build plugins; `nock` and `jest-fetch-mock` for HTTP.
- `tsd` is used in `js` and `vue` to validate the public type surface (`*.test-d.ts`).
- The `local-rules/no-test-imports` lint rule means production code under `src/` cannot import jest helpers — keep test fixtures inside `test/`.

To run a single package's tests: `cd packages/<name> && pnpm test`, or from the root with `pnpm --filter @honeybadger-io/<name> test` / `lerna run test --scope @honeybadger-io/<name>`.

## Builds and bundling

| Package          | Builder                                | Output                                                |
| ---------------- | -------------------------------------- | ----------------------------------------------------- |
| `core`           | `tsc --build`                          | `build/src/...`                                       |
| `js`             | `tsc` + Rollup (browser + server)      | `dist/browser/`, `dist/server/`, plus typedefs copied by `scripts/copy-typedefs.js` and the feedback-form bundle from `scripts/generate-feedback-form-assets.js` |
| `react`          | `tsc` + Rollup + types-only `tsc`      | `dist/honeybadger-react.{cjs,esm}.js`                 |
| `vue`            | Rollup (umd, esm, iife, iife-min)      | `dist/honeybadger-vue.*`                              |
| `nextjs`         | `tsc` + Rollup (main + scripts) + types| `dist/`                                               |
| `react-native`   | Rollup                                 | `dist/`                                               |
| `cloudflare`     | `tsc`                                  | `dist/` (ESM only)                                    |
| `esbuild-plugin` | `tsc`                                  | `dist/`                                               |
| `webpack`        | Babel CLI                              | `dist/`                                               |
| `rollup-plugin`  | Rollup                                 | `dist/{cjs,es}/`                                      |
| `plugin-core`    | Rollup                                 | `dist/`                                               |
| `gatsby-plugin`  | _none_                                 | Source files published as-is.                         |

From the root: `pnpm run build` runs `lerna run build --stream` and respects TS project-reference order. Always build from root before debugging cross-package TS errors.

`scripts/clean-repo.sh` removes every `dist/`, `build/`, `node_modules/`, and `tsconfig.tsbuildinfo` in the tree. Use it before reinstalling on a stale checkout.

## Install & local dev

- **Install only from the repo root**: `pnpm install`. Workspace packages are declared in `pnpm-workspace.yaml` (`packages/*`); a root install links them via the `workspace:` protocol. Running `pnpm install` / `npm install` inside a single package will break the link graph.
- Add a dependency to a single package: `pnpm add <pkg> --filter @honeybadger-io/<name>` (or edit the package's `package.json` and re-run root `pnpm install`). Use `pnpm add -D` for devDependencies. In-repo deps must use `workspace:^`.
- To run an arbitrary script across packages: `lerna run <script>` (with optional `--scope`) or `pnpm --filter <pkg> <script>`. Missing scripts are silently skipped by lerna.
- There is a single root `pnpm-lock.yaml`; packages do not keep their own lockfiles (example apps under `packages/*/examples/` may still use npm lockfiles — they are standalone).
- pnpm's strict `node_modules` means phantom (undeclared) dependencies fail at install/test time. Declare what you import; do not rely on hoisting.

## Commit messages and PR titles

- Conventional Commits, enforced in CI by the `commitlint.yml` workflow against the PR title. There is no local pre-commit hook (no `.husky/`), so individual commit messages on a feature branch aren't validated until merge — keep the PR title clean.
- Allowed types follow `@commitlint/config-conventional` (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `revert`, `style`).
- Use a scope when a change is package-specific, e.g. `feat(js): ...`, `fix(cloudflare): ...`, `chore(release): ...`. In Lerna independent mode, version bumps are driven by **which package directories changed**, not by the commit scope — the type (`feat`/`fix`/breaking) controls bump size, and the scope is mainly for changelog grouping and readability.
- A `!` suffix or `BREAKING CHANGE:` footer triggers a major bump and is flagged by `commitlint.yml` with a reminder to add an upgrade guide.
- The `[skip ci]` marker on the `chore(release): publish` commit prevents the release workflow from looping.

## CI workflows (`.github/workflows/`)

- **`node.js.yml`** (Node CI) — runs on PRs to `master` and is `workflow_call`-able. Jobs:
  - `unit` — `pnpm install --frozen-lockfile` then `pnpm test` on Node 22.
  - `changes` — uses `dorny/paths-filter` to detect edits in `packages/core/**` or `packages/js/**`.
  - `integration` — only when `core` filter matches; installs Playwright browsers and runs `packages/js` E2E against BrowserStack. Uploads `playwright-report/` on failure.
  - `lint` — `pnpm run lint` on Node 20.
- **`commitlint.yml`** — validates the PR title against commitlint and posts an upgrade-guide reminder for breaking-change PRs.
- **`lerna-publish.yml`** (Publish New Release) — push to `master` or manual dispatch. Calls `node.js.yml` first, then runs `pnpm run release` (`lerna publish --conventional-commits`). Uses a GitHub App token, NPM Trusted Publishing (OIDC, hence `id-token: write`), and AWS/Bunny credentials for the CDN.
- **`npm-publish.yml`** — manual fallback that runs `lerna publish from-package` against whatever versions are already in `master`. Use when the main release workflow partially fails.
- **`cdn-publish.yml`** — manual fallback that re-runs `packages/js` `postpublish` (S3/CloudFront upload + Bunny purge).

All workflows use `pnpm/action-setup` (version from `packageManager`) and `actions/setup-node` with `cache: 'pnpm'`.

NPM Trusted Publishing is configured per-package; only one workflow can be the trusted publisher at a time. Default = `lerna-publish.yml`. If you switch it temporarily for a fallback run, switch it back afterwards (called out in the README too).

## Releases

- Independent versioning: each package's version bump is computed from the conventional commits that touched its files since its last release tag.
- Release flow:
  1. Merge PRs to `master` with conventional commits.
  2. `lerna-publish.yml` runs CI, then `pnpm run release`, which:
     - Bumps versions via `lerna version`.
     - Generates each package's `CHANGELOG.md` (`conventional-changelog-angular` preset).
     - Commits `chore(release): publish [skip ci]` and tags.
     - Publishes to npm with Trusted Publishing.
     - Creates a GitHub Release.
  3. `@honeybadger-io/js` has a `postpublish` script (`scripts/release-cdn.sh`) that uploads the browser bundle to S3/CloudFront and purges Bunny.
- Brand-new packages cannot use Trusted Publishing on their first release. Procedure:
  1. Let the workflow fail at the npm publish step (changelog + GitHub release still succeed).
  2. Locally: `npm login`, then `lerna publish from-package --yes --loglevel silly`.
  3. Configure Trusted Publishing for the new package on npm.

## Working in this repo as an agent

- **Always start from the repo root.** Run `pnpm install` there, run `pnpm run build` there, run `pnpm run lint` there. Use `lerna run <script> --scope=...` or `pnpm --filter @honeybadger-io/<name> <script>` for per-package tasks.
- **Never install inside a package.** To add a dependency, use `pnpm add <pkg> [--filter @honeybadger-io/<name>]` from the root (see "Install & local dev"). A package-local install breaks the workspace link graph.
- **Mind project references.** A change in `core` requires a rebuild before downstream packages typecheck cleanly. Run `pnpm run build` (or at minimum `lerna run build --scope @honeybadger-io/core` and any downstream).
- **Match the package's existing tooling.** Don't introduce Jest into a Mocha package, or vice-versa, without strong reason. Don't add new build tools to a package that already has one — extend the existing config.
- **Honor the lint rules.** Run `pnpm run lint` before completing a change. Note the custom `local-rules/no-test-imports` — keep all jest helpers behind `test/`.
- **Conventional commits + scopes.** Lerna decides which packages to version from the files each commit touches — keep a commit confined to one package whenever practical, and scope it accordingly (`feat(js): ...`) so the generated changelog is readable. Cross-package refactors usually warrant separate commits per package for the same reason.
- **Don't hand-edit `CHANGELOG.md` or version fields.** Both are owned by `lerna publish`.
- **Don't run releases manually.** Releases are GitHub-Actions-driven. Local `lerna publish` is reserved for the new-package bootstrap case.
- **Examples are non-build artifacts.** `packages/*/examples/` directories are documentation; they are not built by the package build, are mostly excluded from lint, and shouldn't import from the package's `dist/` — they should consume the published API.
- **Browser vs Node code in `packages/js`.** The split is enforced by file naming (`*.browser.test.ts` / `*.server.test.ts`) and entry points (`src/browser.ts` / `src/server.ts`). When adding browser-only or server-only code, place it under `src/browser/` or `src/server/` respectively.
- **Declare what you import.** pnpm does not hoist arbitrary transitive deps into a package's `node_modules`. If a phantom dependency surfaces at build/test time, add it explicitly.

### Agent skills

Project-level skills live in [`.agents/skills/`](.agents/skills/). Cursor and Claude Code both discover skills in this directory. Read the relevant `SKILL.md` before following a workflow it covers.

| Skill | When to use |
| ----- | ----------- |
| [`create-pull-request`](.agents/skills/create-pull-request/SKILL.md) | Before opening or submitting a pull request — remove planning artifacts, request an AI review (Codex CLI or Claude), and format the PR title. |
| [`writing-documentation`](.agents/skills/writing-documentation/SKILL.md) | When a change needs user-facing documentation — recommend a docs-repo issue (create only after human approval); do not document features in READMEs here. |

**Keep skills up to date.** When new conventions are deduced during work, or when existing rules or conventions change as the code evolves, update the corresponding `SKILL.md` and add a row to the table above in the same PR.

## Quick reference: root scripts

| Command             | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `pnpm install`      | Installs all workspace deps and links packages together.           |
| `pnpm run build`    | `lerna run build --stream` across all packages.                    |
| `pnpm test`         | `lerna run test --stream` across all packages.                     |
| `pnpm run lint`     | `eslint .` from the repo root.                                     |
| `pnpm run clean`    | `scripts/clean-repo.sh` — wipes all `dist`, `build`, `node_modules`, tsbuildinfo files. |
| `pnpm run release`  | CI-only. Runs `lerna publish` with conventional-commits config.    |
