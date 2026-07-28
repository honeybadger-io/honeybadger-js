/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  // Ensure the WHATWG fetch globals exist in the test sandbox; some Node 22.x
  // builds don't expose them to jest-environment-node. See jest.setup.cjs.
  setupFiles: ['<rootDir>/../jest.setup.cjs'],
};
