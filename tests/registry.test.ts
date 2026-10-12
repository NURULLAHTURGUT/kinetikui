/**
 * Registry integrity: every component folder follows the folder contract and
 * every published artifact is derivable from the source.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  CATEGORIES,
  buildItems,
  closure,
  loadItems,
  type RegistryItem,
} from '../scripts/lib/registry';

const items = loadItems();
const components = items.filter(
  (i): i is RegistryItem & Required<Pick<RegistryItem, 'meta' | 'dir'>> => i.kind !== 'shared',
);

describe('registry', () => {
  it('builds without validation errors (imports, dependencies, ownership)', () => {
    assert.doesNotThrow(() => buildItems(items));
  });

  it('has unique item names', () => {
    const names = items.map((i) => i.name);
    assert.equal(new Set(names).size, names.length);
  });

  it('resolves every dependency closure', () => {
    for (const item of items) assert.doesNotThrow(() => closure(item.name, items), item.name);
  });
});

describe('component and template folder contract', () => {
  for (const item of components) {
    describe(item.name, () => {
      const file = (name: string) => path.join(item.dir, name);

      it('is named after its folder', () => {
        assert.equal(item.name, path.basename(item.dir));
      });

      for (const required of [
        'item.json',
        'docs.mdx',
        'demo.tsx',
        `${item.name}.tsx`,
        `${item.name}.test.tsx`,
      ]) {
        it(`has ${required}`, () =>
          assert.ok(fs.existsSync(file(required)), `${item.name}/${required} is missing`));
      }

      it('has complete metadata', () => {
        const m = item.meta;
        assert.ok(m.title && m.description, 'title and description');
        assert.ok(m.description.length <= 120, 'description fits on one line (≤120 chars)');
        assert.ok(
          m.category in CATEGORIES,
          `category "${m.category}" is one of ${Object.keys(CATEGORIES).join(', ')}`,
        );
        assert.ok([1, 2, 3].includes(m.phase), 'phase');
        assert.equal(
          m.category === 'screen',
          item.kind === 'template',
          'templates (and only templates) are in the screen category',
        );
        assert.match(m.version, /^\d+\.\d+\.\d+$/, 'semver version');
        assert.ok(m.web === 'live' || m.web === 'device-only', 'web support flag');
        assert.ok(m.perf?.budget, 'performance note');
        assert.ok(
          m.a11y?.reducedMotion && m.a11y.screenReader && m.a11y.touchTarget,
          'accessibility notes',
        );
        assert.ok(m.files.includes(`${item.name}.tsx`), 'ships its main file');
      });

      it('documents usage, when to use and when not to use', () => {
        const docs = fs.readFileSync(file('docs.mdx'), 'utf8');
        for (const heading of ['## Usage', '## When to use', '## When not to use']) {
          assert.ok(docs.includes(heading), `docs.mdx needs "${heading}"`);
        }
      });

      it('never hard-codes colours in the component', () => {
        for (const f of item.files) {
          const source = fs.readFileSync(f.abs, 'utf8');
          const hex = source.match(/['"`](#[0-9a-fA-F]{3,8}|rgba?\()/g);
          assert.equal(
            hex,
            null,
            `${path.basename(f.abs)} contains literal colours: ${hex?.join(', ')}`,
          );
        }
      });

      it('supports reduced motion', (t) => {
        // Templates compose components, which handle reduced motion themselves.
        if (item.kind === 'template') return t.skip('composes components');
        const source = item.files.map((f) => fs.readFileSync(f.abs, 'utf8')).join('\n');
        assert.match(source, /useReduceMotion\(/, 'calls useReduceMotion()');
      });

      it('keeps gesture roots from being flattened away (collapsable={false})', () => {
        for (const f of item.files) {
          const source = fs.readFileSync(f.abs, 'utf8');
          const detectors =
            source.match(
              /<GestureDetector[^>]*>\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)?<[A-Za-z.]+\s+collapsable=\{false\}/g,
            ) ?? [];
          const total = source.match(/<GestureDetector/g)?.length ?? 0;
          assert.equal(
            detectors.length,
            total,
            `${path.basename(f.abs)}: GestureDetector child needs collapsable={false}`,
          );
        }
      });

      it('does not import other components directly', (t) => {
        if (item.kind === 'template') return t.skip('templates compose components');
        for (const f of item.files) {
          const source = fs.readFileSync(f.abs, 'utf8');
          assert.doesNotMatch(
            source,
            /from '\.\.\/(?!\.\.\/shared)[a-z-]+\//,
            'cross-component import; declare a registryDependency instead',
          );
        }
      });
    });
  }
});

describe('templates', () => {
  for (const item of components.filter((i) => i.kind === 'template')) {
    it(`${item.name} is built only from Kinetik components and shared code`, () => {
      for (const dep of item.registryDependencies) {
        const target = items.find((i) => i.name === dep);
        assert.ok(target && target.kind !== 'template', `${dep} is a component or shared item`);
      }
      assert.ok(
        item.registryDependencies.some(
          (d) => items.find((i) => i.name === d)?.kind === 'component',
        ),
        'uses at least one component',
      );
    });
  }
});

describe('README', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  it('lists every component and screen template', () => {
    for (const item of components) {
      // Titles are plain words; Prettier pads table cells with spaces.
      const row = new RegExp(`\\|\\s*${item.title}\\s*\\|`);
      assert.match(readme, row, `README.md is missing ${item.title}`);
    }
  });
});
