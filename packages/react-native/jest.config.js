module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './babel.config.js' },
    ],
  },
  // pnpm nests packages under node_modules/.pnpm/.../node_modules/<pkg>, so the
  // react-native preset's default transformIgnorePatterns (which only unwraps a
  // top-level node_modules/<pkg>) leaves @react-native/polyfills untransformed.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|@react-native/))',
  ],
};
