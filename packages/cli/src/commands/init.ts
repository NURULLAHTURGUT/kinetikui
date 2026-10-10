import fs from 'node:fs';
import path from 'node:path';

import { expoInstall, planInstall, writeFiles } from '../install';
import {
  defaultLayout,
  findProject,
  installedVersion,
  major,
  writeConfig,
  type KinetikConfig,
} from '../project';
import { DEFAULT_REGISTRY, Registry } from '../registry';
import { CliError, c, log } from '../ui';

export const CORE_ITEMS = ['kinetik-tokens', 'kinetik-motion'];
export const MIN_EXPO_SDK = 54;

export type InitOptions = {
  cwd: string;
  registry?: string;
  componentsDir?: string;
  libDir?: string;
  skipInstall: boolean;
  overwrite: boolean;
};

/** Hard requirements: an Expo project on a supported SDK with the New Architecture on. */
export function assertSupportedProject(root: string): { sdk: number } {
  const expo = installedVersion(root, 'expo');
  const sdk = major(expo);
  if (!expo || sdk === undefined) {
    throw new CliError(
      'This does not look like an Expo project (expo is not installed).',
      'Kinetik targets Expo apps: npx create-expo-app',
    );
  }
  if (sdk < MIN_EXPO_SDK) {
    throw new CliError(
      `Expo SDK ${sdk} is not supported. Kinetik needs SDK ${MIN_EXPO_SDK}+ (Reanimated 4, New Architecture).`,
      'Upgrade with: npx expo install expo@latest --fix',
    );
  }
  if (newArchDisabled(root)) {
    throw new CliError(
      'The New Architecture is disabled (newArchEnabled: false). Reanimated 4 requires it.',
      'Remove "newArchEnabled": false from app.json.',
    );
  }
  return { sdk };
}

export function newArchDisabled(root: string): boolean {
  for (const file of ['app.json', 'app.config.json']) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    try {
      const json = JSON.parse(fs.readFileSync(full, 'utf8')) as {
        expo?: Record<string, unknown>;
      } & Record<string, unknown>;
      const expo = (json.expo ?? json) as {
        newArchEnabled?: boolean;
        android?: { newArchEnabled?: boolean };
        ios?: { newArchEnabled?: boolean };
      };
      if (
        expo.newArchEnabled === false ||
        expo.android?.newArchEnabled === false ||
        expo.ios?.newArchEnabled === false
      )
        return true;
    } catch {
      // An unreadable app.json is reported by `expo` itself.
    }
  }
  return false;
}

export async function init(options: InitOptions): Promise<KinetikConfig> {
  const project = findProject(options.cwd);
  const { sdk } = assertSupportedProject(project.root);
  log.step(`Expo SDK ${sdk} project at ${c.dim(project.root)}`);

  const layout = defaultLayout(project.root);
  const config: KinetikConfig = {
    $schema: 'https://kinetik-ui.dev/schema/kinetik.json',
    registry:
      options.registry ??
      project.config?.registry ??
      process.env.KINETIK_REGISTRY ??
      DEFAULT_REGISTRY,
    componentsDir: options.componentsDir ?? project.config?.componentsDir ?? layout.componentsDir,
    libDir: options.libDir ?? project.config?.libDir ?? layout.libDir,
    installed: project.config?.installed ?? {},
  };

  const registry = new Registry(config.registry);
  const items = await registry.resolve(CORE_ITEMS);
  const plan = planInstall(project, config, items);
  const written = writeFiles(project, plan.files, options.overwrite);
  for (const item of items) config.installed[item.name] = item.meta?.version ?? '0.0.0';
  writeConfig(project.root, config);

  for (const f of written)
    log.success(`${f.status === 'conflict' ? 'Updated' : 'Created'} ${f.path}`);
  for (const f of plan.files.filter((p) => p.status === 'conflict' && !options.overwrite)) {
    log.warn(`Kept your changes to ${f.path} (use --overwrite to replace it)`);
  }
  log.success(`Wrote ${c.bold('kinetik.json')}`);

  if (!options.skipInstall) await expoInstall(project.root, plan.missingDependencies);
  else if (plan.missingDependencies.length)
    log.warn(`Skipped installing: ${plan.missingDependencies.join(', ')}`);

  return config;
}
