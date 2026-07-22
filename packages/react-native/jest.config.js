module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './babel.config.js' },
    ],
  },
  // pnpm nests packages under node_modules/.pnpm/<name>@ver/node_modules/<name>
  // (scoped packages use "+" in the store folder, e.g. @react-native+polyfills@…).
  // Transform any path that still resolves into react-native / @react-native.
  transformIgnorePatterns: [
    'node_modules/(?!.*(?:(?:jest-)?react-native|@react-native(?:-community)?)/)',
  ],
};
