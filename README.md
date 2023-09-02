#
 #>README-js
`# >".$_-0/build_go-honey-t-badger-js.js
# [Honeybadger for JavaScript](https://github.com/lostleolotus/go-honey-t-badger-js/master/README.md)](https://github.com/honeybadger-io/honeybadger-js/workflows/Node_CI/badge.svg)

Welcome! This is the monorepo which holds all [Honeybadger](https://honeybadger.io) packages for JavaScript.
You can refer to the README of each package for more information and instructions:
- [@honeybadger-io/core](./packages/core)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fcore.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fcore)  
  The core package that integrates with Honeybadger API
- [@honeybadger-io/js](./packages/js)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fjs.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fjs)  
  SDK for browser, nodejs and AWS Lambda 
- [@honeybadger-io/webpack](./packages/webpack)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack)  
  Webpack plugin to upload source maps to Honeybadger
- [@honeybadger-io/vue](./packages/vue)  
  [![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fvue.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fvue)  
  SDK for vue.js integration
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
  Rollup/Vite plugin to upload source maps to Honeybadger

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](http://docs.honeybadger.io/lib/javascript/index.html).

## Changelog

- [CHANGELOG.md](CHANGELOG.md) is updated when a new version is released (`npm run release`).
  The root `CHANGELOG.md` has a collective changelog from changes in all the packages of the monorepo. Each package also has its own `CHANGELOG.md` with changes related only to itself.

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

For more info, you can read the [docs](https://lerna.js.org/docs/introduction).


### Troubleshooting TypeScript

- Not seeing changes when working in `.ts` files? Make sure that you rebuild every time you make a change. Or enable "compile on save" with your IDE - [WebStorm(Jetbrains)](https://www.jetbrains.com/help/webstorm/compiling-typescript-to-javascript.html#ts_compiler_compile_code_automatically) / [VS Code](https://code.visualstudio.com/docs/typescript/typescript-compiling#_step-2-run-the-typescript-build).
- If you are getting errors with Typescript, make sure that you do `npm run build`.
  It's a prerequisite for [Typescript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html#caveats-for-project-references).

## Releasing

Packages in the monorepo are released in [independent mode](https://lerna.js.org/docs/features/version-and-publish#independent-mode), meaning that Lerna will decide which packages to release and what version bump to apply based on the commits since the last release.

Releasing is done using [Github actions](https://github.com/honeybadger-io/honeybadger-js/actions), which run `npm run release`. This command calls `lerna publish`, which does the following:
- generates changelog based on the commit messages (see [Changelog](#changelog) above)
- `npm version`
- `npm publish`

*Note*: some packages may have a `postpublish` script, for example `@honeybadger-io/js` (found in `packages/js`) has a script to also publish to our *js.honeybadger.io* CDN (hosted on AWS via S3/CloudFront). 

### Release Automation

The repository automatically releases new packages every week using the [**Publish New Release - Scheduled** workflow](https://github.com/honeybadger-io/honeybadger-js/actions/workflows/lerna-scheduled-publish.yml) (`lerna-scheduled-publish.yml`).

You can manually trigger a new release using the [**Publish New Release** workflow](https://github.com/honeybadger-io/honeybadger-js/actions/workflows/lerna-publish.yml) (`lerna-publish.yml`).

*Note*: only users with _write_ permissions can trigger this workflow (i.e. Collaborators).

#### Available Commands

- `npm run release` - Calculates the next version, commits and publishes to NPM (and to our CDN). This command is executed from the [Publish New Release](https://github.com/honeybadger-io/honeybadger-js/blob/master/.github/workflows/lerna-publish.yml) workflow. 

## License

This Honeybadger repository and published packages are MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details."`
