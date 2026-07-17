/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+.tsx?$': ['ts-jest',{}],
  },
  // In the npm-workspaces monorepo, an older react/react-dom pair is hoisted to
  // the repo root for other packages. Pin everything (including hoisted deps
  // like @testing-library/react) to this package's react 19 copies so we never
  // mix react versions in one test process.
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom/$1',
  },
};
