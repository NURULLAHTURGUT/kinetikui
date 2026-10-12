import fs from 'node:fs/promises';
import path from 'node:path';

import { assertItemName } from './safety';
import { CliError } from './ui';

export const DEFAULT_REGISTRY = 'https://kinetik-ui.dev/r';

export type RegistryFile = {
  path: string;
  type: string;
  target: string;
  content?: string;
};

export type RegistryItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  categories?: string[];
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  meta?: {
    version?: string;
    kind?: 'component' | 'shared' | 'template';
    category?: string;
    web?: string;
  };
};

export type RegistryIndex = {
  name: string;
  homepage?: string;
  items: RegistryItem[];
};

/**
 * Reads registry JSON from a URL (`https://…/r`) or a local directory (handy
 * for testing a registry build before publishing it).
 */
export class Registry {
  private cache = new Map<string, Promise<RegistryItem>>();

  constructor(readonly base: string) {}

  private isRemote() {
    return /^https?:\/\//.test(this.base);
  }

  private async read(file: string): Promise<unknown> {
    if (this.isRemote()) {
      const url = `${this.base.replace(/\/$/, '')}/${file}`;
      let res: Response;
      try {
        res = await fetch(url, { headers: { accept: 'application/json' } });
      } catch (error) {
        throw new CliError(
          `Could not reach the registry at ${url}`,
          `Check your connection or pass --registry. (${String(error)})`,
        );
      }
      if (res.status === 404) throw new CliError(`Not found in registry: ${url}`);
      if (!res.ok) throw new CliError(`Registry request failed (${res.status}) for ${url}`);
      return res.json();
    }
    const full = path.resolve(this.base, file);
    try {
      return JSON.parse(await fs.readFile(full, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new CliError(`Not found in registry: ${full}`);
      throw error;
    }
  }

  index(): Promise<RegistryIndex> {
    return this.read('registry.json') as Promise<RegistryIndex>;
  }

  item(name: string): Promise<RegistryItem> {
    // Names become file paths and URLs: no `../`, slashes or odd characters.
    try {
      assertItemName(name);
    } catch (error) {
      return Promise.reject(error as Error);
    }
    let pending = this.cache.get(name);
    if (!pending) {
      pending = this.read(`${name}.json`) as Promise<RegistryItem>;
      this.cache.set(name, pending);
    }
    return pending;
  }

  /** The item and everything it depends on, dependencies first. */
  async resolve(names: string[]): Promise<RegistryItem[]> {
    const seen = new Set<string>();
    const order: RegistryItem[] = [];
    const visit = async (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      const item = await this.item(name);
      for (const dep of item.registryDependencies ?? []) await visit(dependencyName(dep));
      order.push(item);
    };
    for (const name of names) await visit(name);
    return order;
  }
}

/** `https://host/r/kinetik-tokens.json` → `kinetik-tokens`; plain names pass through. */
export function dependencyName(ref: string): string {
  const base = ref.split('/').pop() ?? ref;
  return base.replace(/\.json$/, '');
}
