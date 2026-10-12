/**
 * Builds cdn/dist, the files served from cdn.kinetik-ui.dev:
 *
 *   canvaskit/<version>/canvaskit.wasm   Skia's web runtime for the live previews
 *   canvaskit/<version>/LICENSE          its BSD-3-Clause notice
 *   _headers                             CORS and long-lived caching
 *
 * Paths carry the package version, so a file never changes once deployed.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'cdn', 'dist');
const CANVASKIT = path.join(ROOT, 'node_modules', 'canvaskit-wasm');

const { version } = JSON.parse(fs.readFileSync(path.join(CANVASKIT, 'package.json'), 'utf8')) as {
  version: string;
};
const target = path.join(OUT, 'canvaskit', version);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(
  path.join(CANVASKIT, 'bin', 'full', 'canvaskit.wasm'),
  path.join(target, 'canvaskit.wasm'),
);
fs.copyFileSync(path.join(CANVASKIT, 'LICENSE'), path.join(target, 'LICENSE'));
fs.writeFileSync(
  path.join(OUT, '_headers'),
  `/canvaskit/*
  Access-Control-Allow-Origin: *
  Cross-Origin-Resource-Policy: cross-origin
  Cache-Control: public, max-age=31536000, immutable
`,
);
console.log(`CDN files: canvaskit ${version}`);
