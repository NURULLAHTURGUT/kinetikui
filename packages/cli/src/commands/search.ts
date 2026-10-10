import type { RegistryItem } from '../registry';
import { c, log } from '../ui';
import { loadComponents, printItems } from './list';

/** Scores an item against a query: name hits beat title hits beat description hits. */
export function score(item: RegistryItem, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;
  let total = 0;
  for (const term of terms) {
    const name = item.name.toLowerCase();
    const title = (item.title ?? '').toLowerCase();
    const desc = (item.description ?? '').toLowerCase();
    const cat = (item.meta?.category ?? item.categories?.[0] ?? '').toLowerCase();
    let s = 0;
    if (name === term) s = 10;
    else if (name.includes(term)) s = 6;
    else if (title.includes(term)) s = 5;
    else if (cat.includes(term)) s = 3;
    else if (desc.includes(term)) s = 2;
    if (s === 0) return 0; // every term must match something
    total += s;
  }
  return total;
}

export function searchItems(items: RegistryItem[], query: string): RegistryItem[] {
  return items
    .map((item) => ({ item, s: score(item, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.item.name.localeCompare(b.item.name))
    .map((r) => r.item);
}

export async function search(options: {
  cwd: string;
  query: string;
  registry?: string;
  json: boolean;
}): Promise<void> {
  const { items, installed } = await loadComponents(options.cwd, options.registry);
  const hits = searchItems(items, options.query);
  if (options.json) {
    console.log(
      JSON.stringify(
        hits.map((i) => ({ name: i.name, title: i.title, description: i.description })),
        null,
        2,
      ),
    );
    return;
  }
  if (hits.length === 0) {
    log.info(
      `No components match ${c.bold(`"${options.query}"`)}. Try ${c.cyan('npx kinetik-ui list')}.`,
    );
    return;
  }
  printItems(hits, installed);
}
