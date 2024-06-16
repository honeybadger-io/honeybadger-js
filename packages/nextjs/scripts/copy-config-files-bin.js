#!/usr/bin/env node

/**
 * This file must be a JavaScript (instead of Typescript) because of how Lerna builds and installs packages.
 * Problem:
 * On local development, Lerna will install packages, symlink the ones that are inside the monorepo
 * and finally it will run build scripts (such us Typescript compilation and Rollup bundling).
 * While sym-linking (which happens before build), it will symlink bin executables.
 * If we were pointing to a JavaScript file that would
 * have been generated after the build, it would not be available
 * at the time of the symlink and Lerna would throw an error.
 */

const { copyConfigFiles } = require('../dist/copy-config-files')

copyConfigFiles().catch((err) => {
  console.error(err)
  process.exit(1)
})
