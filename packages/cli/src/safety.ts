import path from 'node:path';

import { CliError } from './ui';

/**
 * Checks on everything the CLI takes from a registry before it touches the
 * user's machine. A registry is remote data (or a path the user passed with
 * --registry), so the CLI never trusts it with file paths or shell arguments.
 */

/**
 * An npm package name with an optional version range. No spaces and none of
 * the characters a shell treats specially (`&|;<>$` and quotes), so the result
 * is safe to pass to `npx expo install`, which runs through a shell on Windows.
 */
const PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[a-z0-9.^~*+-]+)?$/;

/** Registry item names: lowercase words joined by hyphens, like `glint-card`. */
const ITEM_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isPackageSpec(value: string): boolean {
  return value.length <= 214 && PACKAGE_SPEC.test(value);
}

export function isItemName(value: string): boolean {
  return value.length <= 100 && ITEM_NAME.test(value);
}

export function assertItemName(name: string): string {
  if (!isItemName(name)) {
    throw new CliError(
      `"${name}" is not a valid component name.`,
      'Names are lowercase words joined by hyphens, like glint-card.',
    );
  }
  return name;
}

export function assertPackageSpecs(specs: string[], source: string): string[] {
  const bad = specs.filter((s) => !isPackageSpec(s));
  if (bad.length > 0) {
    throw new CliError(
      `${source} declares a dependency that is not a valid npm package name: ${bad.map((b) => JSON.stringify(b)).join(', ')}`,
      'Nothing was installed. If you use a custom --registry, check that it is one you trust.',
    );
  }
  return specs;
}

/**
 * Resolves a project-relative path and refuses anything that would land
 * outside the project root (`../`, absolute paths, drive letters).
 */
export function resolveInside(root: string, rel: string): string {
  const base = path.resolve(root);
  if (rel.includes('\0') || path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) {
    throw outside(rel);
  }
  const abs = path.resolve(base, rel);
  const relative = path.relative(base, abs);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw outside(rel);
  }
  return abs;
}

function outside(rel: string) {
  return new CliError(
    `Refusing to write outside the project: ${JSON.stringify(rel)}`,
    'A registry file targets a path outside your project. Nothing was written.',
  );
}
