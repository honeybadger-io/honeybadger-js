# Honeybadger for JavaScript

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fjs.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fjs)

Welcome! This is the monorepo which holds all [Honeybadger](https://honeybadger.io) packages built with JavaScript.

It uses [lerna](https://lerna.js.org/) to:
- link between packages, 
- generate changelogs and bump versions (based on conventional commits) and
- publish to NPM

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](http://docs.honeybadger.io/lib/javascript/index.html).

## Changelog

- [Conventional Commits](https://www.conventionalcommits.org/) are enforced with a git hook ([husky](https://typicode.github.io/husky) + [commitlint](https://commitlint.js.org/)) in order to automate changelog generation.

- [CHANGELOG.md](CHANGELOG.md) is updated when a new version is released (`npm run release`).
  The root `CHANGELOG.md` has a collective changelog from changes in all the packages of the monorepo. Each package also has it's own `CHANGELOG.md` with changes related only to itself.

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "chore: boom"` 
4. Push to your branch `git push origin my_branch`
5. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

## Development

1. Run `npm install` from the monorepo root.
2. Run `npm test` from the monorepo root to run unit tests for all packages.

### Troubleshooting Typescript

- Not seeing changes when working in `.ts` files? Make sure that you rebuild every time you make a change. Or enable "compile on save" with your IDE - [WebStorm(Jetbrains)](https://www.jetbrains.com/help/webstorm/compiling-typescript-to-javascript.html#ts_compiler_compile_code_automatically) / [VS Code](https://code.visualstudio.com/docs/typescript/typescript-compiling#_step-2-run-the-typescript-build).
- If you are getting errors with Typescript, make sure that you do `npm run build`.
  It's a prerequisite for [Typescript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html#caveats-for-project-references).

### Lerna Tips

- Always install from the root, i.e. `npm install` only from the root folder, otherwise you may get unexpected issues with the linked packages.
- Use `lerna add my-pkg --scope="@honeybadger-io/js"` to add `my-pkg` in the `@honeybadger-io/js` project. Or you can manually add to the target project's `package.json` file. You still need to run `npm install` from the root.
- Use `lerna run` to execute commands for all projects. If the command is not found it will not be executed. You can filter the packages using `--scope`. For example, `lerna run test` will execute `npm run test` to all packages that have this script available.

For more info, you can read the [docs](https://lerna.js.org/docs/introduction).

## Releasing

All packages in the monorepo are released in [fixed mode](https://lerna.js.org/docs/features/version-and-publish#fixedlocked-mode-default), meaning they are released under the same version.  
Releasing is done using `npm run release`. This command calls `lerna publish`, which does the following:
- generates changelog based on the commit messages (see [Changelog](#changelog) above)
- `npm version`
- `npm publish`

*Note*: some packages may have a `postpublish` script, for example `@honeybadger-io/js` (found in `packages/js`) has a script to also publish to our *js.honeybadger.io* CDN (hosted on AWS via S3/CloudFront). 

### Release Automation

For the moment, there are no automated releases. You can manually trigger a new release using the `Publish New Release` (`lerna-publish.yml`) workflow.

*Note*: only users with _write_ permissions can trigger this workflow (i.e. Collaborators).

#### Available Commands

- `npm run release` - Calculates the next version, commits and publishes to NPM (and to our CDN). This command is executed from the [Publish New Release](https://github.com/honeybadger-io/honeybadger-js/blob/master/.github/workflows/lerna-publish.yml) workflow. 

## License

The Honeybadger gem is MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details.
