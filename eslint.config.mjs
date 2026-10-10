import expoConfig from 'eslint-config-expo/flat.js';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/coverage/**',
      'apps/*/android/**',
      'apps/*/ios/**',
      'public/r/**',
      'packages/registry/demos.generated.ts',
      'tmp/**',
    ],
  },
  ...expoConfig,
  {
    // eslint-plugin-react's version auto-detect calls an API removed in ESLint 10.
    settings: { react: { version: '19.2' } },
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'react/no-unstable-nested-components': 'off',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // Node tooling legitimately prints to stdout.
    files: ['scripts/**', 'packages/cli/**', 'packages/mcp/**', 'tests/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // The MCP SDK resolves subpaths through a `./*` exports wildcard that
    // eslint-plugin-import cannot follow; tsc checks these imports instead.
    files: ['packages/mcp/**'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk/'] }] },
  },
];
