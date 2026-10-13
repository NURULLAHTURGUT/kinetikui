/**
 * Registry model shared by the build scripts and the integrity tests.
 *
 * `packages/registry` is the single source of truth. Everything published
 * (public/r/*.json, the root registry.json, llms.txt, docs data, MCP data) is
 * derived from it here; nothing downstream is written by hand.
 */
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');
export const REGISTRY_DIR = path.join(ROOT, 'packages', 'registry');
export const ITEMS_DIR = path.join(REGISTRY_DIR, 'items');
/** Full screens composed from components (onboarding, paywall, ...). */
export const TEMPLATES_DIR = path.join(REGISTRY_DIR, 'templates');
export const SHARED_DIR = path.join(REGISTRY_DIR, 'shared');
export const PUBLIC_DIR = path.join(ROOT, 'public', 'r');

/** Base URL the registry is served from. */
export const REGISTRY_URL = (process.env.KINETIK_REGISTRY_URL ?? 'https://kinetik-ui.dev').replace(
  /\/$/,
  '',
);

export const COMPONENT_TARGET_DIR = '~/components/kinetik';
export const LIB_TARGET_DIR = '~/lib/kinetik';
export const SCREEN_TARGET_DIR = '~/components/kinetik/screens';

/** Packages every React Native project already has; never listed as dependencies. */
export const IMPLICIT_PACKAGES = new Set(['react', 'react-native']);

/** Peer packages a dependency requires at install time even though no file imports them. */
export const IMPLIED_PEERS: Record<string, string[]> = {
  'react-native-reanimated': ['react-native-worklets'],
};

/** Declared dependencies plus their implied peers: what actually gets installed. */
export function installDependencies(dependencies: string[]): string[] {
  const out = new Set(dependencies);
  for (const dep of dependencies) for (const peer of IMPLIED_PEERS[dep] ?? []) out.add(peer);
  return [...out].sort();
}

export const CATEGORIES = {
  background: 'Background',
  card: 'Card',
  interaction: 'Interaction',
  input: 'Inputs',
  disclosure: 'Disclosure',
  text: 'Text',
  navigation: 'Navigation',
  feedback: 'Feedback',
  data: 'Data',
  screen: 'Screens',
} as const;
export type Category = keyof typeof CATEGORIES;

export type WebSupport = 'live' | 'device-only';

export type PerfMeasurement = {
  device: string;
  /** `emulator` results are indicative only; `device` results are real hardware. */
  kind: 'emulator' | 'device';
  /** ISO date of the run. */
  date?: string;
  build?: 'release' | 'debug';
  /** Median frame time while interacting. */
  frameMs: number;
  p90Ms?: number;
  /** Median frame time of the system Settings app on the same machine and session. */
  baselineMs?: number;
  jankyPercent?: number;
  /** Whether the component keeps drawing with no input (shaders, loops, live tilt). */
  atRest?: 'idle' | 'animating';
  /** Total app PSS with the demo open. */
  memoryMb?: number;
  notes?: string;
};

export type ItemMeta = {
  name: string;
  title: string;
  description: string;
  category: Category;
  phase: 1 | 2 | 3;
  version: string;
  dependencies: string[];
  registryDependencies: string[];
  files: string[];
  web: WebSupport;
  webNote?: string;
  perf: { budget: string; measurements: PerfMeasurement[] };
  a11y: { reducedMotion: string; screenReader: string; touchTarget: string };
};

export type SourceFile = {
  /** Absolute path on disk. */
  abs: string;
  /** Path relative to packages/registry, POSIX separators. */
  rel: string;
  /** Install target, `~` = project root. */
  target: string;
};

export type RegistryItem = {
  kind: 'component' | 'shared' | 'template';
  name: string;
  title: string;
  description: string;
  version: string;
  dependencies: string[];
  registryDependencies: string[];
  files: SourceFile[];
  /** Component and template metadata (category, docs, perf, a11y). */
  meta?: ItemMeta;
  /** Component folder, absolute. */
  dir?: string;
};

const posix = (p: string) => p.split(path.sep).join('/');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

type SharedItemsFile = {
  items: {
    name: string;
    title: string;
    description: string;
    dependencies: string[];
    registryDependencies: string[];
    files: string[];
  }[];
};

const SHARED_VERSION = readJson<{ version: string }>(
  path.join(REGISTRY_DIR, 'package.json'),
).version;

export function loadItems(): RegistryItem[] {
  const shared = readJson<SharedItemsFile>(path.join(SHARED_DIR, 'items.json')).items.map(
    (s): RegistryItem => ({
      kind: 'shared',
      name: s.name,
      title: s.title,
      description: s.description,
      version: SHARED_VERSION,
      dependencies: [...s.dependencies].sort(),
      registryDependencies: s.registryDependencies,
      files: s.files.map((f) => {
        const abs = path.join(SHARED_DIR, f);
        return {
          abs,
          rel: posix(path.relative(REGISTRY_DIR, abs)),
          target: `${LIB_TARGET_DIR}/${posix(f)}`,
        };
      }),
    }),
  );

  const folderItems = (root: string, kind: 'component' | 'template', targetDir: string) =>
    fs.existsSync(root)
      ? fs
          .readdirSync(root, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
          .map((dirName): RegistryItem => {
            const dir = path.join(root, dirName);
            const metaFile = path.join(dir, 'item.json');
            if (!fs.existsSync(metaFile))
              throw new RegistryError(`${dirName}: item.json is missing`);
            const meta = readJson<ItemMeta>(metaFile);
            return {
              kind,
              name: meta.name,
              title: meta.title,
              description: meta.description,
              version: meta.version,
              dependencies: [...meta.dependencies].sort(),
              registryDependencies: meta.registryDependencies,
              files: meta.files.map((f) => {
                const abs = path.join(dir, f);
                return {
                  abs,
                  rel: posix(path.relative(REGISTRY_DIR, abs)),
                  target: `${targetDir}/${posix(f)}`,
                };
              }),
              meta,
              dir,
            };
          })
      : [];

  return [
    ...shared,
    ...folderItems(ITEMS_DIR, 'component', COMPONENT_TARGET_DIR),
    ...folderItems(TEMPLATES_DIR, 'template', SCREEN_TARGET_DIR),
  ];
}

export class RegistryError extends Error {}

const IMPORT_RE = /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(['"])([^'"]+)\2/gm;

export type ImportRef = { spec: string; index: number; length: number };

export function findImports(source: string): ImportRef[] {
  const out: ImportRef[] = [];
  for (const m of source.matchAll(IMPORT_RE)) {
    const prefix = m[1] ?? '';
    const quote = m[2] ?? '';
    const spec = m[3] ?? '';
    out.push({ spec, index: (m.index ?? 0) + prefix.length + quote.length, length: spec.length });
  }
  return out;
}

/** `@scope/pkg/sub` → `@scope/pkg`, `pkg/sub` → `pkg`. */
export function packageName(spec: string): string {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? spec);
}

const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolveRelative(fromAbs: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromAbs), spec);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Relative import specifier between two `~/` targets, without extension. */
export function relativeSpecifier(fromTarget: string, toTarget: string): string {
  const rel = path.posix
    .relative(path.posix.dirname(fromTarget), toTarget)
    .replace(/\.(tsx?|jsx?)$/, '');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

export type BuiltFile = SourceFile & { content: string };

export type BuiltItem = RegistryItem & { builtFiles: BuiltFile[]; usedPackages: string[] };

/**
 * Validates every item and rewrites relative imports from the source layout
 * (items/x/x.tsx → ../../shared/...) to the install layout
 * (~/components/kinetik/x.tsx → ../../lib/kinetik/...).
 */
export function buildItems(items: RegistryItem[] = loadItems()): BuiltItem[] {
  const errors: string[] = [];
  const byName = new Map(items.map((i) => [i.name, i]));
  const ownerOf = new Map<string, { item: RegistryItem; file: SourceFile }>();

  for (const item of items) {
    for (const file of item.files) {
      if (!fs.existsSync(file.abs)) errors.push(`${item.name}: file not found: ${file.rel}`);
      const prev = ownerOf.get(file.abs);
      if (prev) errors.push(`${file.rel} is claimed by both ${prev.item.name} and ${item.name}`);
      ownerOf.set(file.abs, { item, file });
    }
    for (const dep of item.registryDependencies) {
      if (!byName.has(dep)) errors.push(`${item.name}: unknown registryDependency "${dep}"`);
    }
  }
  if (errors.length) throw new RegistryError(errors.join('\n'));

  const built = items.map((item): BuiltItem => {
    const used = new Set<string>();
    const builtFiles = item.files.map((file): BuiltFile => {
      const source = fs.readFileSync(file.abs, 'utf8').replace(/\r\n/g, '\n');
      let content = '';
      let cursor = 0;
      for (const ref of findImports(source)) {
        if (!ref.spec.startsWith('.')) {
          const pkg = packageName(ref.spec);
          if (!IMPLICIT_PACKAGES.has(pkg)) used.add(pkg);
          continue;
        }
        const resolved = resolveRelative(file.abs, ref.spec);
        const owner = resolved ? ownerOf.get(resolved) : undefined;
        if (!resolved || !owner) {
          errors.push(
            `${item.name}: ${file.rel} imports "${ref.spec}", which is not part of any registry item`,
          );
          continue;
        }
        if (owner.item !== item && !item.registryDependencies.includes(owner.item.name)) {
          errors.push(
            `${item.name}: ${file.rel} imports ${owner.file.rel} from "${owner.item.name}" but does not list it in registryDependencies`,
          );
        }
        content +=
          source.slice(cursor, ref.index) + relativeSpecifier(file.target, owner.file.target);
        cursor = ref.index + ref.length;
      }
      content += source.slice(cursor);
      return { ...file, content };
    });

    const usedPackages = [...used].sort();
    for (const pkg of usedPackages) {
      if (!item.dependencies.includes(pkg))
        errors.push(`${item.name}: imports "${pkg}" but does not list it in dependencies`);
    }
    for (const pkg of item.dependencies) {
      if (!used.has(pkg))
        errors.push(`${item.name}: lists "${pkg}" in dependencies but never imports it`);
    }
    return { ...item, builtFiles, usedPackages };
  });

  if (errors.length) throw new RegistryError(errors.join('\n'));
  return built;
}

/** All registry items an item needs, dependencies first, the item itself last. */
export function closure(name: string, items: RegistryItem[]): RegistryItem[] {
  const byName = new Map(items.map((i) => [i.name, i]));
  const seen = new Set<string>();
  const order: RegistryItem[] = [];
  const visit = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    const item = byName.get(n);
    if (!item) throw new RegistryError(`unknown item "${n}"`);
    item.registryDependencies.forEach(visit);
    order.push(item);
  };
  visit(name);
  return order;
}

export function itemUrl(name: string): string {
  return `${REGISTRY_URL}/r/${name}.json`;
}
