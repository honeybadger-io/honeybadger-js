# Honeybadger for JavaScript

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)

Welcome! This monorepo contains all [Honeybadger](https://honeybadger.io) packages for JavaScript.
Refer to each package's README for more information and setup instructions:
- [@honeybadger-io/core](./packages/core)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fcore.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fcore)  
  The core package that integrates with the Honeybadger API
- [@honeybadger-io/js](./packages/js)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fjs.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fjs)  
  SDK for browsers, Node.js, and AWS Lambda
- [@honeybadger-io/webpack](./packages/webpack)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack)  
  Webpack plugin for uploading source maps to Honeybadger
- [@honeybadger-io/vue](./packages/vue)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fvue.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fvue)  
  SDK for Vue.js integration
- [@honeybadger-io/react](./packages/react)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Freact.svg)](https://badge.fury.io/js/%40honeybadger-io%2Freact)  
  SDK for React integration
- [@honeybadger-io/nextjs](./packages/nextjs)  
  [![npm version](https://badge.fury.io/js/@honeybadger-io%2Fnextjs.svg)](https://badge.fury.io/js/@honeybadger-io%2Fnextjs)  
  SDK for Next.js integration
- [@honeybadger-io/gatsby-plugin-honeybadger](./packages/gatsby-plugin)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fgatsby-plugin-honeybadger.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fgatsby-plugin-honeybadger)  
  [Gatsby](https://www.gatsbyjs.com) plugin
- [@honeybadger-io/react-native](./packages/react-native)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Freact-native.svg)](https://badge.fury.io/js/%40honeybadger-io%2Freact-native)  
  SDK for React Native integration
- [@honeybadger-io/rollup-plugin](./packages/rollup-plugin)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Frollup-plugin.svg)](https://badge.fury.io/js/%40honeybadger-io%2Frollup-plugin)  
  Rollup/Vite plugin for uploading source maps to Honeybadger
- [@honeybadger-io/esbuild-plugin](./packages/esbuild-plugin)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fesbuild-plugin.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fesbuild-plugin)  
  esbuild plugin for uploading source maps to Honeybadger
- [@honeybadger-io/plugin-core](./packages/plugin-core)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fplugin-core.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fplugin-core)  
  Utility functions shared by the Rollup, Webpack, and esbuild plugins

## Documentation and Support

For comprehensive documentation and support, see our docs: https://docs.honeybadger.io/lib/javascript/index.html

## Changelog

- Each package's `CHANGELOG.md` is updated when a new version is released (`npm run release`).

- [Conventional Commits](https://www.conventionalcommits.org/) are enforced with a Git hook (via [husky](https://typicode.github.io/husky) + [commitlint](https://commitlint.js.org/)) in order to automate changelog generation.

## Contributing

1. Fork the repo.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "chore: boom"` 
4. Push to your branch `git push origin my_branch`
5. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

## Development

We use [Lerna](https://lerna.js.org/) to manage the monorepo. It helps us:
- link between packages,
- generate changelogs and bump versions (based on conventional commits) and
- publish to NPM

1. Run `npm install` from the monorepo root.
2. Run `npm test` from the monorepo root to run unit tests for all packages.


### Lerna Tips

- Always install from the root, i.e. `npm install` only from the root folder, otherwise you may get unexpected issues with the linked packages.
- Use `lerna add my-pkg --scope="@honeybadger-io/js"` to add `my-pkg` in the `@honeybadger-io/js` project. Or you can manually add to the target project's `package.json` file. You still need to run `npm install` from the root.
- Use `lerna run` to execute commands for all projects. If the command is not found it will not be executed. You can filter the packages using `--scope`. For example, `lerna run test` will execute `npm run test` to all packages that have this script available.

> [!TIP]
> For more info, you can read the [docs](https://lerna.js.org/docs/introduction).


### Troubleshooting TypeScript

- Not seeing changes when working in `.ts` files? Make sure that you rebuild every time you make a change. Or enable "compile on save" with your IDE — [WebStorm (JetBrains)](https://www.jetbrains.com/help/webstorm/compiling-typescript-to-javascript.html#ts_compiler_compile_code_automatically) / [VS Code](https://code.visualstudio.com/docs/typescript/typescript-compiling#_step-2-run-the-typescript-build).
- If you are getting errors with TypeScript, make sure that you run `npm run build`.
  It's a prerequisite for [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html#caveats-for-project-references).

## Releasing

Packages in the monorepo are released in [independent mode](https://lerna.js.org/docs/features/version-and-publish#independent-mode), meaning that Lerna will decide which packages to release and what version bump to apply based on the commits since the last release.

Releases are performed via [GitHub Actions](https://github.com/honeybadger-io/honeybadger-js/actions), which run `npm run release`. That command calls `lerna publish`, which:
- generates the changelog based on commit messages (see [Changelog](#changelog) above)
- runs `npm version`
- runs `npm publish`

> [!NOTE] 
> Some packages may have a `postpublish` script, for example `@honeybadger-io/js` (found in `packages/js`) has a script to also publish to our *js.honeybadger.io* CDN (hosted on AWS via S3/CloudFront). 

### Release Automation

The repository automatically releases new packages when a PR is merged on master using the [**Publish New Release** workflow](https://github.com/honeybadger-io/honeybadger-js/actions/workflows/lerna-publish.yml) (`lerna-publish.yml`).

> [!IMPORTANT]
> NPM releases are authorized through NPM Trusted Publishing. Only one workflow can be configured as a Trusted Publisher at a time. Keep the scheduled workflow configured by default. If you need to manually trigger a different workflow, temporarily switch NPM Trusted Publishing to that workflow, and revert back to the scheduled workflow afterward.

> [!WARNING]
> Only users with _write_ permissions can trigger this workflow (i.e. Collaborators).

#### Available Commands

- `npm run release` - Calculates the next version, commits and publishes to NPM (and to our CDN). This command is executed from the [Publish New Release](https://github.com/honeybadger-io/honeybadger-js/blob/master/.github/workflows/lerna-publish.yml) workflow. 

## License

This Honeybadger repository and published packages are MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details.
