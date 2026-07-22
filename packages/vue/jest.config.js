module.exports = {
  rootDir: './',
  moduleFileExtensions: [
    'js',
    'json',
    'vue'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '.*\\.(vue)$': 'vue-jest'
  },
  testPathIgnorePatterns: [
    '<rootDir>/test/e2e'
  ],
  setupFiles: [],
  coverageDirectory: '<rootDir>/test/unit/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!**/node_modules/**'
  ],
  resolver: '<rootDir>/test/unit/resolver.js',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
}
