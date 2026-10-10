/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Skia's environment loads CanvasKit (WASM) so Skia components render for real.
  testEnvironment: '<rootDir>/jest/skia-env.js',
  testEnvironmentOptions: { customExportConditions: ['require', 'react-native'] },
  // Worklets ships a resolver that skips .native files so its JS runtime is used under Jest.
  resolver: 'react-native-worklets/jest/resolver',
  setupFiles: ['<rootDir>/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/after-env.js'],
  testMatch: [
    '<rootDir>/items/**/*.test.tsx',
    '<rootDir>/templates/**/*.test.tsx',
    '<rootDir>/a11y/**/*.test.tsx',
    '<rootDir>/shared/**/*.test.ts?(x)',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-native-reanimated|react-native-worklets|react-native-gesture-handler|@shopify/react-native-skia))',
  ],
};
