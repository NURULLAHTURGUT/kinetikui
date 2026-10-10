import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { planInstall } from '../install';
import { dependencyVersion, findProject, installedVersion, major } from '../project';
import { Registry } from '../registry';
import { c, log } from '../ui';
import { MIN_EXPO_SDK, newArchDisabled } from './init';

type Check = { level: 'ok' | 'warn' | 'error'; message: string; hint?: string };

export type DoctorOptions = { cwd: string; registry?: string; expoCheck: boolean };

/** Returns the number of errors found. */
export async function doctor(options: DoctorOptions): Promise<number> {
  const project = findProject(options.cwd);
  const checks: Check[] = [];
  const push = (level: Check['level'], message: string, hint?: string) =>
    checks.push({ level, message, ...(hint ? { hint } : null) });

  // Expo SDK and architecture.
  const expo = installedVersion(project.root, 'expo');
  const sdk = major(expo);
  if (!expo || sdk === undefined)
    push('error', 'expo is not installed', 'Kinetik targets Expo apps.');
  else if (sdk < MIN_EXPO_SDK)
    push(
      'error',
      `Expo SDK ${sdk} is below the supported minimum (${MIN_EXPO_SDK})`,
      'npx expo install expo@latest --fix',
    );
  else push('ok', `Expo SDK ${sdk} (expo ${expo})`);

  if (newArchDisabled(project.root))
    push(
      'error',
      'New Architecture is disabled',
      'Remove "newArchEnabled": false from app.json; Reanimated 4 requires it.',
    );
  else push('ok', 'New Architecture enabled');

  const rn = installedVersion(project.root, 'react-native');
  if (rn) push('ok', `react-native ${rn}`);

  // Babel: Reanimated 4 moved its plugin into react-native-worklets, which babel-preset-expo adds itself.
  const babel = ['babel.config.js', 'babel.config.cjs', '.babelrc']
    .map((f) => path.join(project.root, f))
    .find((f) => fs.existsSync(f));
  if (babel && /react-native-reanimated\/plugin/.test(fs.readFileSync(babel, 'utf8'))) {
    push(
      'warn',
      `${path.basename(babel)} lists react-native-reanimated/plugin`,
      'babel-preset-expo already adds the worklets plugin; remove the manual entry.',
    );
  }

  // Kinetik config and installed items.
  const config = project.config;
  if (!config) {
    push('warn', 'kinetik.json not found', 'Run: npx kinetik-ui init');
  } else {
    push(
      'ok',
      `kinetik.json → components in ${config.componentsDir}, shared code in ${config.libDir}`,
    );
    const names = Object.keys(config.installed);
    if (names.length) {
      try {
        const registry = new Registry(options.registry ?? config.registry);
        const items = await registry.resolve(names);
        const plan = planInstall(project, config, items);
        for (const dep of plan.dependencies) {
          if (!dependencyVersion(project.pkg, dep))
            push('error', `${dep} is required but not in package.json`, `npx expo install ${dep}`);
        }
        const missing = plan.files.filter((f) => !fs.existsSync(path.join(project.root, f.path)));
        const modified = plan.files.filter((f) => f.status === 'conflict');
        for (const f of missing)
          push(
            'error',
            `${f.path} is missing (from ${f.item})`,
            `npx kinetik-ui add ${f.item} --overwrite`,
          );
        if (modified.length) {
          push(
            'warn',
            `${modified.length} installed file(s) differ from the registry`,
            'Run `npx kinetik-ui diff` to review.',
          );
        } else if (!missing.length) {
          push('ok', `${names.length} registry item(s) installed and in sync`);
        }
        if (
          plan.dependencies.includes('react-native-gesture-handler') &&
          !hasGestureRoot(project.root)
        ) {
          push(
            'warn',
            'No <GestureHandlerRootView> found in the app',
            'Wrap your root layout in <GestureHandlerRootView style={{ flex: 1 }}>.',
          );
        }
      } catch (error) {
        push('warn', `Could not reach the registry to compare files (${(error as Error).message})`);
      }
    }
  }

  // Version compatibility, as Expo sees it.
  if (options.expoCheck && expo) {
    const res = spawnSync('npx', ['expo', 'install', '--check'], {
      cwd: project.root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1' },
    });
    const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim();
    if (res.status === 0) push('ok', 'Dependency versions match the Expo SDK');
    else
      push(
        'error',
        'Some dependencies do not match the Expo SDK',
        `npx expo install --fix\n${indent(output)}`,
      );
  }

  for (const check of checks) {
    const icon =
      check.level === 'ok' ? c.green('✔') : check.level === 'warn' ? c.yellow('!') : c.red('✖');
    log.info(`${icon} ${check.message}`);
    if (check.hint) log.info(c.dim(indent(check.hint)));
  }
  const errors = checks.filter((x) => x.level === 'error').length;
  const warnings = checks.filter((x) => x.level === 'warn').length;
  log.blank();
  log.info(
    errors || warnings
      ? `${errors} error(s), ${warnings} warning(s)`
      : c.green('Everything looks good.'),
  );
  return errors;
}

function indent(s: string) {
  return s
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}

function hasGestureRoot(root: string): boolean {
  const candidates = [
    'App.tsx',
    'App.js',
    'app/_layout.tsx',
    'src/app/_layout.tsx',
    'app/_layout.js',
    'src/app/_layout.js',
    'index.tsx',
    'index.js',
  ];
  return candidates.some((f) => {
    const full = path.join(root, f);
    return fs.existsSync(full) && fs.readFileSync(full, 'utf8').includes('GestureHandlerRootView');
  });
}
