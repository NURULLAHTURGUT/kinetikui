import { expoInstall, planInstall, writeFiles } from '../install';
import { findProject, writeConfig } from '../project';
import { DEFAULT_REGISTRY, Registry } from '../registry';
import { CliError, c, log } from '../ui';
import { assertSupportedProject, init } from './init';

export type AddOptions = {
  cwd: string;
  names: string[];
  registry?: string;
  skipInstall: boolean;
  overwrite: boolean;
  dryRun: boolean;
};

export async function add(options: AddOptions): Promise<void> {
  if (options.names.length === 0) {
    throw new CliError('Name at least one component.', 'Example: npx kinetik-ui add glint-card');
  }

  let project = findProject(options.cwd);
  assertSupportedProject(project.root);
  if (!project.config && !options.dryRun) {
    log.step('No kinetik.json yet; running init first.');
    await init({
      cwd: options.cwd,
      registry: options.registry,
      skipInstall: options.skipInstall,
      overwrite: false,
    });
    log.blank();
    project = findProject(options.cwd);
  }
  const config = project.config ?? {
    registry: DEFAULT_REGISTRY,
    componentsDir: 'components/kinetik',
    libDir: 'lib/kinetik',
    installed: {},
  };
  if (options.registry) config.registry = options.registry;

  const registry = new Registry(config.registry);
  const items = await registry.resolve(options.names);
  const plan = planInstall(project, config, items);

  if (options.dryRun) {
    log.info(c.bold('Files'));
    for (const f of plan.files) log.info(`  ${statusLabel(f.status)} ${f.path}`);
    log.info(c.bold('Dependencies (expo install)'));
    log.info(
      `  ${plan.missingDependencies.length ? plan.missingDependencies.join(' ') : c.dim('none missing')}`,
    );
    return;
  }

  const written = writeFiles(project, plan.files, options.overwrite);
  for (const f of written)
    log.success(`${f.status === 'conflict' ? 'Updated' : 'Created'} ${f.path}`);
  const kept = plan.files.filter((f) => f.status === 'conflict' && !options.overwrite);
  for (const f of kept) {
    log.warn(
      `Kept your changes to ${f.path} (use --overwrite to replace, or \`kinetik diff\` to compare)`,
    );
  }
  if (written.length === 0 && kept.length === 0) log.success('Files already up to date.');

  for (const item of items) config.installed[item.name] = item.meta?.version ?? '0.0.0';
  writeConfig(project.root, config);

  if (!options.skipInstall) await expoInstall(project.root, plan.missingDependencies);
  else if (plan.missingDependencies.length)
    log.warn(`Skipped installing: ${plan.missingDependencies.join(', ')}`);

  const requested = items.filter((i) => options.names.includes(i.name));
  log.blank();
  for (const item of requested) {
    const file = plan.files.find((f) => f.item === item.name);
    log.info(
      `${c.ember('●')} ${c.bold(item.title ?? item.name)} ${c.dim(`→ ${file?.path ?? ''}`)}`,
    );
  }
  if (requested.some((i) => (i.dependencies ?? []).includes('react-native-gesture-handler'))) {
    log.info(
      c.dim(
        '  Gesture-driven components need the app wrapped in <GestureHandlerRootView style={{ flex: 1 }}>.',
      ),
    );
  }
}

function statusLabel(status: 'create' | 'identical' | 'conflict') {
  if (status === 'create') return c.green('create   ');
  if (status === 'identical') return c.dim('unchanged');
  return c.yellow('modified ');
}
