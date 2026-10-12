import path from 'node:path';

export type Layout = {
  /** Project-relative directory for components (default target `~/components/kinetik`). */
  componentsDir: string;
  /** Project-relative directory for shared code (default target `~/lib/kinetik`). */
  libDir: string;
};

const DEFAULT_PREFIXES = {
  components: '~/components/kinetik',
  lib: '~/lib/kinetik',
} as const;

const posix = path.posix;

/** Maps a registry target (`~/components/kinetik/x.tsx`) to a project-relative path. */
export function mapTarget(target: string, layout: Layout): string {
  if (target.startsWith(`${DEFAULT_PREFIXES.components}/`)) {
    return posix.join(
      toPosix(layout.componentsDir),
      target.slice(DEFAULT_PREFIXES.components.length + 1),
    );
  }
  if (target.startsWith(`${DEFAULT_PREFIXES.lib}/`)) {
    return posix.join(toPosix(layout.libDir), target.slice(DEFAULT_PREFIXES.lib.length + 1));
  }
  if (target.startsWith('~/')) return target.slice(2);
  return target;
}

const IMPORT_RE =
  /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(['"])(\.{1,2}\/[^'"]*)\2/gm;
const EXT_RE = /\.(tsx?|jsx?)$/;

/**
 * Registry files ship with relative imports that are correct for the default
 * layout. When the project uses a different layout, each relative import is
 * resolved against the default targets and re-pointed at the mapped location.
 */
export function rewriteImports(
  content: string,
  fileTarget: string,
  layout: Layout,
  knownTargets: string[],
): string {
  const fromMapped = mapTarget(fileTarget, layout);
  const known = new Map(knownTargets.map((t) => [t.replace(EXT_RE, ''), t]));
  return content.replace(IMPORT_RE, (match, prefix: string, quote: string, spec: string) => {
    const resolved = posix.normalize(posix.join(posix.dirname(fileTarget), spec));
    const target = known.get(resolved) ?? known.get(`${resolved}/index`);
    if (!target) return match;
    let rel = posix
      .relative(posix.dirname(fromMapped), mapTarget(target, layout))
      .replace(EXT_RE, '');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${prefix}${quote}${rel}${quote}`;
  });
}

export function toPosix(p: string): string {
  return p.split(path.sep).join('/').replace(/^\.\//, '').replace(/\/$/, '');
}
