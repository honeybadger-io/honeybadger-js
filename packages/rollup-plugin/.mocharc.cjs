const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number)

// Node >= 22.6 can load .ts files natively (type stripping), which makes mocha
// skip the ts-node/register fallback these tests rely on (testdouble module
// replacement and extensionless imports only work through the CJS path).
const hasStripTypes = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 6)

module.exports = {
  extension: ['ts'],
  spec: 'test/**/*.test.ts',
  require: 'ts-node/register',
  ...(hasStripTypes ? { 'node-option': ['no-experimental-strip-types'] } : {}),
}
