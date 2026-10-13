import { findProject } from '../project';
import { DEFAULT_REGISTRY, Registry, type RegistryItem } from '../registry';
import { c, log } from '../ui';

const CATEGORY_ORDER = [
  'background',
  'card',
  'interaction',
  'input',
  'disclosure',
  'overlay',
  'text',
  'navigation',
  'feedback',
  'data',
  'screen',
];

export async function loadComponents(
  cwd: string,
  registryOverride?: string,
): Promise<{ items: RegistryItem[]; installed: Record<string, string> }> {
  let installed: Record<string, string> = {};
  let base = registryOverride ?? process.env.KINETIK_REGISTRY ?? DEFAULT_REGISTRY;
  try {
    const project = findProject(cwd);
    installed = project.config?.installed ?? {};
    if (!registryOverride && project.config) base = project.config.registry;
  } catch {
    // Listing works outside a project too.
  }
  const index = await new Registry(base).index();
  return { items: index.items.filter((i) => i.meta?.kind !== 'shared'), installed };
}

export function printItems(items: RegistryItem[], installed: Record<string, string>): void {
  const groups = new Map<string, RegistryItem[]>();
  for (const item of items) {
    const cat = item.meta?.category ?? item.categories?.[0] ?? 'other';
    groups.set(cat, [...(groups.get(cat) ?? []), item]);
  }
  const order = [
    ...CATEGORY_ORDER,
    ...[...groups.keys()].filter((k) => !CATEGORY_ORDER.includes(k)),
  ];
  const width = Math.max(...items.map((i) => i.name.length), 10) + 2;
  for (const cat of order) {
    const group = groups.get(cat);
    if (!group) continue;
    log.info(c.bold(cat.toUpperCase()));
    for (const item of group) {
      const mark = installed[item.name] ? c.green('●') : c.dim('○');
      log.info(`  ${mark} ${item.name.padEnd(width)}${c.dim(item.description ?? '')}`);
    }
    log.blank();
  }
}

export async function list(options: {
  cwd: string;
  registry?: string;
  json: boolean;
}): Promise<void> {
  const { items, installed } = await loadComponents(options.cwd, options.registry);
  if (options.json) {
    const rows = items.map((i) => ({
      name: i.name,
      title: i.title,
      description: i.description,
      category: i.meta?.category,
      installed: installed[i.name] ?? null,
    }));
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  printItems(items, installed);
  log.info(
    c.dim(`${items.length} components · ● installed · add one with: npx kinetik-ui add <name>`),
  );
}
