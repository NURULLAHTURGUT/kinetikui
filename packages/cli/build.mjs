// Bundles the CLI into dist/index.js. The MCP server (@kinetik/mcp, a private
// workspace package) is compiled in; its runtime dependencies stay external
// and are declared in package.json, so npm installs and audits them normally.
import { build } from 'esbuild';
import { readFile, rm } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));

await rm(new URL('./dist', import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20.19',
  format: 'cjs',
  external: Object.keys(pkg.dependencies ?? {}),
  // Keeps stack traces readable for bug reports without shipping source maps.
  minify: false,
  legalComments: 'none',
  logLevel: 'warning',
});
