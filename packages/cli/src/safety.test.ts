import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { add } from './commands/add';
import { planInstall, writeFiles } from './install';
import type { KinetikConfig, Project } from './project';
import { Registry, type RegistryItem } from './registry';
import { isItemName, isPackageSpec, resolveInside } from './safety';
import { CliError } from './ui';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetik-safety-'));
after(() => fs.rmSync(root, { recursive: true, force: true }));

const project: Project = { root, pkg: { name: 'app' }, config: null };
const config: KinetikConfig = {
  componentsDir: 'components/kinetik',
  libDir: 'lib/kinetik',
  registry: 'https://kinetik-ui.dev/r',
  installed: {},
};

function item(target: string, dependencies: string[] = []): RegistryItem {
  return {
    name: 'evil',
    type: 'registry:item',
    dependencies,
    files: [{ path: 'evil.tsx', type: 'registry:component', target, content: 'export {};\n' }],
  };
}

describe('resolveInside', () => {
  it('accepts paths inside the project', () => {
    assert.equal(
      resolveInside(root, 'components/kinetik/glint-card.tsx'),
      path.join(root, 'components', 'kinetik', 'glint-card.tsx'),
    );
  });

  it('refuses paths that leave the project', () => {
    for (const rel of [
      '../outside.txt',
      'components/../../outside.txt',
      '/etc/passwd',
      'C:\\Windows\\win.ini',
      'C:relative.txt',
      '',
      '.',
      'a\0b',
    ]) {
      assert.throws(() => resolveInside(root, rel), CliError, rel);
    }
  });
});

describe('isPackageSpec', () => {
  it('accepts npm package names and version ranges', () => {
    for (const spec of [
      'expo-blur',
      'react-native-reanimated',
      '@shopify/react-native-skia',
      '@shopify/react-native-skia@^2.6.0',
      'expo-haptics@~15.0.7',
    ]) {
      assert.ok(isPackageSpec(spec), spec);
    }
  });

  it('refuses shell syntax, options and paths', () => {
    for (const spec of [
      'expo-blur & calc',
      'expo-blur&&calc',
      'a|b',
      'a;rm -rf ~',
      '$(id)',
      '`id`',
      '"quoted"',
      'Uppercase',
      'has space',
      '-g',
      '--registry=https://evil.example',
      '../local',
      'a@>1 <2',
      '',
    ]) {
      assert.ok(!isPackageSpec(spec), spec);
    }
  });
});

describe('isItemName', () => {
  it('accepts registry names and refuses anything path-like', () => {
    assert.ok(isItemName('glint-card'));
    assert.ok(isItemName('kinetik-tokens'));
    for (const name of ['../secret', 'a/b', 'Glint', 'glint_card', '-x', 'x-', '']) {
      assert.ok(!isItemName(name), name);
    }
  });
});

describe('install safety', () => {
  it('refuses registry files that target paths outside the project', () => {
    for (const target of ['~/../../outside.txt', '/tmp/outside.txt', '../outside.txt']) {
      assert.throws(() => planInstall(project, config, [item(target)]), CliError, target);
    }
    assert.ok(!fs.existsSync(path.join(root, '..', 'outside.txt')));
  });

  it('refuses registry dependencies that are not package names', () => {
    assert.throws(
      () => planInstall(project, config, [item('~/components/kinetik/ok.tsx', ['x & calc'])]),
      /not a valid npm package name/,
    );
  });

  it('still writes normal files', () => {
    const plan = planInstall(project, config, [
      item('~/components/kinetik/ok.tsx', ['react-native-reanimated']),
    ]);
    writeFiles(project, plan.files, false);
    assert.ok(fs.existsSync(path.join(root, 'components', 'kinetik', 'ok.tsx')));
    assert.deepEqual(plan.dependencies, ['react-native-reanimated']);
  });

  it('refuses writes outside the project even if a plan was tampered with', () => {
    assert.throws(
      () =>
        writeFiles(
          project,
          [{ item: 'evil', path: '../outside.txt', content: 'x', status: 'create' }],
          false,
        ),
      CliError,
    );
  });

  it('refuses item names that would read outside a local registry', async () => {
    const registry = new Registry(root);
    await assert.rejects(registry.item('../package'), CliError);
    await assert.rejects(registry.resolve(['glint-card/../../x']), CliError);
  });

  it('fails on a bad or unknown name before init touches the project', async () => {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetik-add-'));
    try {
      fs.writeFileSync(
        path.join(app, 'package.json'),
        JSON.stringify({ name: 'app', dependencies: { expo: '~57.0.0' } }),
      );
      fs.mkdirSync(path.join(app, 'node_modules', 'expo'), { recursive: true });
      fs.writeFileSync(
        path.join(app, 'node_modules', 'expo', 'package.json'),
        JSON.stringify({ name: 'expo', version: '57.0.0' }),
      );
      const base = { cwd: app, skipInstall: true, overwrite: false, dryRun: false };
      const registry = path.resolve(__dirname, '../../../public/r');
      await assert.rejects(add({ ...base, names: ['../evil'], registry }), CliError);
      await assert.rejects(add({ ...base, names: ['glint-crd'], registry }), CliError);
      assert.deepEqual(fs.readdirSync(app).sort(), ['node_modules', 'package.json']);
    } finally {
      fs.rmSync(app, { recursive: true, force: true });
    }
  });
});
