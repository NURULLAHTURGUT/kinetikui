import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_REGISTRY } from './registry';
import type { Layout } from './transform';
import { CliError } from './ui';

export const CONFIG_FILE = 'kinetik.json';

export type KinetikConfig = Layout & {
  $schema?: string;
  registry: string;
  /** Installed registry items and the version that was copied. */
  installed: Record<string, string>;
};

export type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type Project = {
  root: string;
  pkg: PackageJson;
  config: KinetikConfig | null;
};

/** Walks up from `cwd` to the nearest package.json. */
export function findProject(cwd: string): Project {
  let dir = path.resolve(cwd);
  for (;;) {
    const pkgFile = path.join(dir, 'package.json');
    if (fs.existsSync(pkgFile)) {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8')) as PackageJson;
      return { root: dir, pkg, config: readConfig(dir) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new CliError('No package.json found.', 'Run this inside an Expo project.');
    }
    dir = parent;
  }
}

function readConfig(root: string): KinetikConfig | null {
  const file = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<KinetikConfig>;
    return {
      registry: raw.registry ?? DEFAULT_REGISTRY,
      componentsDir: raw.componentsDir ?? 'components/kinetik',
      libDir: raw.libDir ?? 'lib/kinetik',
      installed: raw.installed ?? {},
      ...(raw.$schema ? { $schema: raw.$schema } : null),
    };
  } catch {
    throw new CliError(`${CONFIG_FILE} is not valid JSON.`);
  }
}

export function writeConfig(root: string, config: KinetikConfig): void {
  const ordered = {
    $schema: config.$schema,
    registry: config.registry,
    componentsDir: config.componentsDir,
    libDir: config.libDir,
    installed: Object.fromEntries(
      Object.entries(config.installed).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  fs.writeFileSync(path.join(root, CONFIG_FILE), `${JSON.stringify(ordered, null, 2)}\n`);
}

/** Expo projects that use `src/` (the default template) get components under it. */
export function defaultLayout(root: string): Layout {
  const useSrc = fs.existsSync(path.join(root, 'src'));
  const base = useSrc ? 'src/' : '';
  return { componentsDir: `${base}components/kinetik`, libDir: `${base}lib/kinetik` };
}

export function dependencyVersion(pkg: PackageJson, name: string): string | undefined {
  return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
}

/** Version actually installed in node_modules, if resolvable. */
export function installedVersion(root: string, name: string): string | undefined {
  try {
    const file = require.resolve(`${name}/package.json`, { paths: [root] });
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as { version?: string }).version;
  } catch {
    return undefined;
  }
}

export function major(version: string | undefined): number | undefined {
  const m = version ? /(\d+)\./.exec(version) : null;
  return m?.[1] ? Number(m[1]) : undefined;
}
