/**
 * Writes results from scripts/perf/measure-android.sh into each component's
 * item.json (`perf.measurements`), replacing an earlier entry for the same
 * device and kind (keeping its notes). The last row for a component wins.
 *
 *   pnpm tsx scripts/perf/record.ts perf.tsv "Pixel 9 emulator, API 35" emulator 65
 *
 * The last argument is the median frame time of the system Settings app
 * scrolled on the same device in the same session, so emulator numbers can be
 * read relative to the machine rather than as absolute frame times.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ROOT, type PerfMeasurement } from '../lib/registry';

const [file, device, kind, baseline] = process.argv.slice(2);
if (!file || !device || (kind !== 'emulator' && kind !== 'device')) {
  console.error('Usage: record.ts <perf.tsv> <device> <emulator|device> [baselineMs]');
  process.exit(1);
}

const rows = new Map<string, string[]>();
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const cols = line.split('\t');
  if (cols.length >= 8) rows.set(cols[0]!, cols);
}

const ms = (s: string) => Number.parseFloat(s);
const date = new Date().toISOString().slice(0, 10);

for (const [name, [, idle, , janky, p50, p90, , pss]] of rows) {
  // Components live in items/, screen templates in templates/.
  const metaFile = ['items', 'templates']
    .map((dir) => path.join(ROOT, 'packages', 'registry', dir, name, 'item.json'))
    .find((f) => fs.existsSync(f));
  if (!metaFile) {
    console.warn(`skip ${name}: no such component`);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const earlier = (meta.perf.measurements as PerfMeasurement[]).find(
    (m) => m.device === device && m.kind === kind,
  );
  const entry: PerfMeasurement = {
    device,
    kind,
    date,
    build: 'release',
    frameMs: ms(p50!),
    p90Ms: ms(p90!),
    ...(baseline ? { baselineMs: ms(baseline) } : null),
    jankyPercent: ms(janky!),
    atRest: Number(idle) > 10 ? 'animating' : 'idle',
    memoryMb: Math.round(Number(pss) / 1024),
    // Notes explain a component's numbers; they outlive a re-measurement.
    ...(earlier?.notes ? { notes: earlier.notes } : null),
  };
  meta.perf.measurements = [
    ...meta.perf.measurements.filter(
      (m: PerfMeasurement) => !(m.device === device && m.kind === kind),
    ),
    entry,
  ];
  fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`${name}: ${entry.frameMs} ms p50, ${entry.atRest} at rest, ${entry.memoryMb} MB`);
}
