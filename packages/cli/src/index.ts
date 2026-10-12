#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { add } from './commands/add';
import { agents } from './commands/agents';
import { diff } from './commands/diff';
import { doctor } from './commands/doctor';
import { init } from './commands/init';
import { list } from './commands/list';
import { mcp } from './commands/mcp';
import { search } from './commands/search';
import { CliError, c, log } from './ui';

const VERSION: string = (require('../package.json') as { version: string }).version;

const HELP = `
${c.ember('kinetik')} ${c.dim(`v${VERSION}`)} — motion components for Expo, copied into your project

${c.bold('Usage')}
  npx kinetik-ui <command> [options]

${c.bold('Commands')}
  init                 Set up kinetik.json, tokens and motion presets
  add <name...>        Copy components into the project and expo-install their dependencies
  list                 List every component (${c.green('●')} installed)
  search <query>       Find components by name, category or description
  doctor               Check Expo SDK, New Architecture, dependencies and installed files
  diff [name...]       Show how your copies differ from the registry
  agents               Add Kinetik guidance for AI agents to AGENTS.md (--skill: also a skill file)
  mcp                  Serve the registry to AI agents (Model Context Protocol, stdio)

${c.bold('Options')}
  --registry <url|dir> Registry base (default: kinetik.json "registry" or https://kinetik-ui.dev/r)
  --overwrite          Replace files you have modified (add, init)
  --dry-run            Show what add would do without writing anything
  --skip-install       Do not run expo install
  --components-dir     Where components go (init; default components/kinetik or src/components/kinetik)
  --lib-dir            Where shared code goes (init; default lib/kinetik or src/lib/kinetik)
  --skill              Also write .claude/skills/kinetik-ui/SKILL.md (agents)
  --json               Machine-readable output (list, search)
  --no-expo-check      Skip \`expo install --check\` (doctor)
  -v, --version        Print the version
  -h, --help           Show this help
`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      overwrite: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'skip-install': { type: 'boolean', default: false },
      'components-dir': { type: 'string' },
      'lib-dir': { type: 'string' },
      json: { type: 'boolean', default: false },
      skill: { type: 'boolean', default: false },
      'no-expo-check': { type: 'boolean', default: false },
      cwd: { type: 'string' },
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const [command, ...rest] = positionals;
  const cwd = values.cwd ?? process.cwd();
  const registry = values.registry ?? process.env.KINETIK_REGISTRY;

  if (values.version) {
    log.info(VERSION);
    return 0;
  }
  if (values.help || !command) {
    log.info(HELP);
    return 0;
  }

  switch (command) {
    case 'init':
      await init({
        cwd,
        registry,
        componentsDir: values['components-dir'],
        libDir: values['lib-dir'],
        skipInstall: values['skip-install'],
        overwrite: values.overwrite,
      });
      log.blank();
      log.info(`Next: ${c.cyan('npx kinetik-ui add glint-card')}`);
      return 0;
    case 'add':
      await add({
        cwd,
        names: rest,
        registry,
        skipInstall: values['skip-install'],
        overwrite: values.overwrite,
        dryRun: values['dry-run'],
      });
      return 0;
    case 'list':
    case 'ls':
      await list({ cwd, registry, json: values.json });
      return 0;
    case 'search':
      if (rest.length === 0)
        throw new CliError('Give a search query.', 'Example: npx kinetik-ui search card');
      await search({ cwd, registry, query: rest.join(' '), json: values.json });
      return 0;
    case 'doctor':
      return (await doctor({ cwd, registry, expoCheck: !values['no-expo-check'] })) > 0 ? 1 : 0;
    case 'diff':
      return (await diff({ cwd, registry, names: rest })) > 0 ? 1 : 0;
    case 'agents':
      agents({ cwd, skill: values.skill });
      return 0;
    case 'mcp':
      await mcp({ cwd, registry, version: VERSION });
      return new Promise<number>(() => {}); // Runs until the client closes stdin.
    default:
      throw new CliError(`Unknown command "${command}".`, 'Run npx kinetik-ui --help');
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof CliError) {
      log.error(error.message);
      if (error.hint) log.info(c.dim(`  ${error.hint}`));
    } else if (
      error instanceof Error &&
      'code' in error &&
      String(error.code).startsWith('ERR_PARSE_ARGS')
    ) {
      log.error(error.message);
    } else {
      log.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
    process.exit(1);
  },
);
