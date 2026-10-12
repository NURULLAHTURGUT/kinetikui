import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { KinetikConfig, Project } from './project';
import { dependencyVersion } from './project';
import type { RegistryItem } from './registry';
import { assertPackageSpecs, resolveInside } from './safety';
import { mapTarget, rewriteImports } from './transform';
import { CliError, c, log } from './ui';

export type PlannedFile = {
  item: string;
  /** Project-relative POSIX path. */
  path: string;
  content: string;
  status: 'create' | 'identical' | 'conflict';
};

export type InstallPlan = {
  files: PlannedFile[];
  dependencies: string[];
  missingDependencies: string[];
};

/** Works out every file write and dependency install without touching disk. */
export function planInstall(
  project: Project,
  config: KinetikConfig,
  items: RegistryItem[],
): InstallPlan {
  const knownTargets = items.flatMap((i) => i.files.map((f) => f.target));
  const files: PlannedFile[] = [];
  for (const item of items) {
    assertPackageSpecs(item.dependencies ?? [], `Registry item "${item.name}"`);
    for (const file of item.files) {
      if (file.content === undefined)
        throw new CliError(`Registry item "${item.name}" has no file contents for ${file.path}.`);
      const rel = mapTarget(file.target, config);
      const content = rewriteImports(file.content, file.target, config, knownTargets);
      const abs = resolveInside(project.root, rel);
      let status: PlannedFile['status'] = 'create';
      if (fs.existsSync(abs)) {
        status =
          normalize(fs.readFileSync(abs, 'utf8')) === normalize(content) ? 'identical' : 'conflict';
      }
      files.push({ item: item.name, path: rel, content, status });
    }
  }
  const dependencies = [...new Set(items.flatMap((i) => i.dependencies ?? []))].sort();
  const missingDependencies = dependencies.filter((d) => !dependencyVersion(project.pkg, d));
  return { files, dependencies, missingDependencies };
}

const normalize = (s: string) => s.replace(/\r\n/g, '\n');

export function writeFiles(
  project: Project,
  files: PlannedFile[],
  overwrite: boolean,
): PlannedFile[] {
  const written: PlannedFile[] = [];
  for (const file of files) {
    if (file.status === 'identical') continue;
    if (file.status === 'conflict' && !overwrite) continue;
    const abs = resolveInside(project.root, file.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, file.content);
    written.push(file);
  }
  return written;
}

/**
 * Installs dependencies with `expo install`, which picks versions that match
 * the project's Expo SDK. Plain npm/pnpm/yarn installs can pick incompatible
 * native versions.
 */
export function expoInstall(root: string, deps: string[]): Promise<void> {
  if (deps.length === 0) return Promise.resolve();
  // Checked again right before the shell sees them (`shell: true` on Windows).
  assertPackageSpecs(deps, 'The install plan');
  log.step(`Installing ${deps.map((d) => c.cyan(d)).join(', ')} with ${c.bold('expo install')}`);
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['expo', 'install', ...deps], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new CliError(
              `expo install exited with code ${code}.`,
              `Run it yourself: npx expo install ${deps.join(' ')}`,
            ),
          ),
    );
  });
}
