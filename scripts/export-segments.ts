/**
 * Runs after the docs site's static export. Next writes a page's prefetch
 * segments as nested folders (`components/__next.components/__PAGE__.txt`)
 * but the client router asks for them by a dotted name
 * (`components/__next.components.__PAGE__.txt`), so a plain static host
 * answers 404 and links fall back to full page loads. Copying each nested
 * file to its dotted name makes every prefetch a static file.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './lib/registry';

const OUT = path.join(ROOT, 'apps', 'docs', 'out');

let copied = 0;
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('__next.')) flatten(full, dir, entry.name);
    else walk(full);
  }
}

/** Copies every file under a `__next.*` folder to `<parent>/<folder>.<a>.<b>.txt`. */
function flatten(dir: string, parent: string, prefix: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const name = `${prefix}.${entry.name}`;
    if (entry.isDirectory()) flatten(full, parent, name);
    else {
      fs.copyFileSync(full, path.join(parent, name));
      copied++;
    }
  }
}

walk(OUT);
console.log(`Export: ${copied} prefetch segments copied to their request paths.`);
