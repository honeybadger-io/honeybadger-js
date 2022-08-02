# Monorepo features
- Typescript with Project References
    - tsconfig.json for the IDE (./src + ./test)
    - tsconfig.build.json to build only ./src
- Conventional Commits with husky and commitlint (global)
- lerna version/publish with conventional commits and changelog
- Eslint (global)

# todo

- [x] typescript - project references
- [x] esModuleInterop - not working because in test folder - consider adding tsconfig in test folder with include
- [x] commitlint - husky
- [x] eslint
- [x] gitignore
- [x] tsd
- [x] js - package.json
- [x] replace shipjs with lerna version
- [x] create draft PR
- [x] js - integration tests
- [x] js - npm run build - remove warnings
- [x] ci - tests
- [x] ci - release new version
- [x] test lerna publish with test org
- [ ] README - core
- [ ] README - js
- [ ] README - monorepo
- [ ] ci - scheduled deployment
- [ ] example projects
  - [x] express
  - [x] almond - (uglify did not work because of es6)
  - [x] aws-lambda
  - [x] aws-lambda-typescript (ts source not found - to check with old version)
  - [x] browserify
  - [ ] chrome-extension
  - [ ] fastify
  - [ ] global
  - [ ] hapi
  - [ ] requirejs
  - [ ] restify
  - [ ] sails
  - [x] webpack
- [x] when monorepo is ready: 
  - [x] enable post-publish script in js package,
  - [x] modify lerna publish workflow to checkout from master and set correct NPM_AUTH_TOKEN
  - [x] remove --no-git-tag-version from lerna publish

# notes

- typescript: enable compile on save with option `-b` so that changes between projects are applied instantly

# known issues
- sometimes typings from other packages do not work and I have to `tsc --build --clean` and then again `tsc --build`
- compile on save doesn't work correctly. when enabled, it compiles files in the same folder; most probably it's not reading the correct tsconfig file
- eslint - Types.Transport - eslint-disable-next-line import/namespace - ???
