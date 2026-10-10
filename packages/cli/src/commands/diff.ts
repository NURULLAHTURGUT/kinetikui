import fs from 'node:fs';
import path from 'node:path';

import { unifiedDiff } from '../diff';
import { planInstall } from '../install';
import { findProject } from '../project';
import { Registry } from '../registry';
import { CliError, c, log } from '../ui';

export type DiffOptions = { cwd: string; names: string[]; registry?: string };

/**
 * Shows how the copied source differs from the registry version: `-` lines are
 * upstream, `+` lines are local. Returns the number of files that differ.
 */
export async function diff(options: DiffOptions): Promise<number> {
  const project = findProject(options.cwd);
  const config = project.config;
  if (!config) throw new CliError('kinetik.json not found.', 'Run: npx kinetik-ui init');
  const names = options.names.length ? options.names : Object.keys(config.installed);
  if (names.length === 0) {
    log.info('Nothing installed yet.');
    return 0;
  }

  const registry = new Registry(options.registry ?? config.registry);
  const items = await Promise.all(names.map((n) => registry.item(n)));
  // Resolve the full closure so imports are rewritten exactly as `add` would.
  const all = await registry.resolve(names);
  const plan = planInstall(project, config, all);
  const wanted = new Set(items.map((i) => i.name));

  let changed = 0;
  for (const file of plan.files.filter((f) => wanted.has(f.item))) {
    const abs = path.join(project.root, file.path);
    if (!fs.existsSync(abs)) {
      log.info(`${c.red('missing')} ${file.path}`);
      changed++;
      continue;
    }
    if (file.status === 'identical') continue;
    changed++;
    const local = fs.readFileSync(abs, 'utf8');
    log.info(
      c.bold(`${file.path}`) +
        c.dim(
          `  (${file.item}: upstream ${config.installed[file.item] ?? '?'} → registry ${all.find((i) => i.name === file.item)?.meta?.version ?? '?'})`,
        ),
    );
    for (const line of unifiedDiff(file.content, local)) {
      if (line.startsWith('@@')) log.info(c.cyan(line));
      else if (line.startsWith('+')) log.info(c.green(line));
      else if (line.startsWith('-')) log.info(c.red(line));
      else log.info(c.dim(line));
    }
    log.blank();
  }
  log.info(
    changed
      ? `${changed} file(s) differ from the registry.`
      : c.green('All files match the registry.'),
  );
  return changed;
}
