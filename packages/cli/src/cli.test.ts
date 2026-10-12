import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { agentsSection, skillFile, upsertSection } from './agents';
import { searchItems } from './commands/search';
import { unifiedDiff } from './diff';
import { dependencyName, type RegistryItem } from './registry';
import { mapTarget, rewriteImports, type Layout } from './transform';

const defaults: Layout = { componentsDir: 'components/kinetik', libDir: 'lib/kinetik' };
const src: Layout = { componentsDir: 'src/components/kinetik', libDir: 'src/lib/kinetik' };
const flat: Layout = { componentsDir: 'app/ui/motion', libDir: 'app/ui/motion/lib' };

const targets = [
  '~/components/kinetik/glint-card.tsx',
  '~/lib/kinetik/tokens/theme.tsx',
  '~/lib/kinetik/tokens/tokens.ts',
  '~/lib/kinetik/hooks/use-tilt.ts',
];

const component = [
  "import { View } from 'react-native';",
  "import { TiltSensor } from '../../lib/kinetik/hooks/use-tilt';",
  "import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';",
  "import { unknown } from './not-in-registry';",
].join('\n');

describe('mapTarget', () => {
  it('maps default prefixes onto the project layout', () => {
    assert.equal(
      mapTarget('~/components/kinetik/glint-card.tsx', src),
      'src/components/kinetik/glint-card.tsx',
    );
    assert.equal(
      mapTarget('~/lib/kinetik/hooks/use-tilt.ts', flat),
      'app/ui/motion/lib/hooks/use-tilt.ts',
    );
    assert.equal(mapTarget('~/AGENTS.md', src), 'AGENTS.md');
  });

  it('puts screen templates in a screens folder next to the components', () => {
    assert.equal(
      mapTarget('~/components/kinetik/screens/paywall.tsx', flat),
      'app/ui/motion/screens/paywall.tsx',
    );
  });
});

describe('rewriteImports', () => {
  it('leaves imports untouched for the default layout', () => {
    assert.equal(rewriteImports(component, targets[0]!, defaults, targets), component);
  });

  it('keeps imports valid when both dirs move together', () => {
    assert.equal(rewriteImports(component, targets[0]!, src, targets), component);
  });

  it('re-points imports for a custom layout', () => {
    const out = rewriteImports(component, targets[0]!, flat, targets);
    assert.match(out, /from '\.\/lib\/hooks\/use-tilt'/);
    assert.match(out, /from '\.\/lib\/tokens\/theme'/);
    assert.match(out, /from 'react-native'/);
    assert.match(out, /from '\.\/not-in-registry'/, 'unknown relative imports are left alone');
  });

  it('rewrites imports between shared files', () => {
    const theme = "import { createTheme } from './tokens';";
    assert.equal(rewriteImports(theme, targets[1]!, flat, targets), theme);
  });
});

describe('dependencyName', () => {
  it('extracts item names from registry URLs', () => {
    assert.equal(dependencyName('https://kinetik-ui.dev/r/kinetik-tokens.json'), 'kinetik-tokens');
    assert.equal(dependencyName('kinetik-motion'), 'kinetik-motion');
  });
});

describe('unifiedDiff', () => {
  it('returns nothing for identical text', () => {
    assert.deepEqual(unifiedDiff('a\nb\nc', 'a\nb\nc'), []);
  });

  it('marks removed and added lines', () => {
    const out = unifiedDiff('a\nb\nc\nd', 'a\nB\nc\nd\ne');
    assert.ok(out.includes('-b'));
    assert.ok(out.includes('+B'));
    assert.ok(out.includes('+e'));
    assert.ok(out.includes(' a'));
  });

  it('ignores CRLF vs LF', () => {
    assert.deepEqual(unifiedDiff('a\r\nb', 'a\nb'), []);
  });

  it('keeps hunks to the surrounding context', () => {
    const before = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
    const after = before.replace('line 20', 'changed');
    const out = unifiedDiff(before, after, 2);
    assert.equal(out.filter((l) => l === '@@').length, 1);
    assert.ok(out.length <= 7);
  });
});

describe('searchItems', () => {
  const items: RegistryItem[] = [
    {
      name: 'glint-card',
      type: 'registry:item',
      title: 'Glint Card',
      description: 'Specular glint',
      files: [],
      meta: { category: 'card' },
    },
    {
      name: 'tilt-deck',
      type: 'registry:item',
      title: 'Tilt Deck',
      description: 'A card that tilts in 3D',
      files: [],
      meta: { category: 'card' },
    },
    {
      name: 'odometer',
      type: 'registry:item',
      title: 'Odometer',
      description: 'Rolling digits',
      files: [],
      meta: { category: 'text' },
    },
  ];

  it('ranks name matches first', () => {
    assert.deepEqual(
      searchItems(items, 'tilt').map((i) => i.name),
      ['tilt-deck'],
    );
    assert.equal(searchItems(items, 'card')[0]?.name, 'glint-card');
  });

  it('requires every term to match', () => {
    assert.deepEqual(searchItems(items, 'card digits'), []);
    assert.deepEqual(
      searchItems(items, 'text rolling').map((i) => i.name),
      ['odometer'],
    );
  });
});

describe('agent instructions', () => {
  const section = agentsSection(src);

  it('uses the project layout', () => {
    assert.match(section, /`src\/components\/kinetik\/`/);
    assert.match(skillFile(src), /^---\nname: kinetik-ui\n/);
  });

  it('creates, appends to and updates AGENTS.md in place', () => {
    const created = upsertSection(null, section);
    assert.ok(created.startsWith('# AGENTS.md'));
    const appended = upsertSection('# Rules\n\nBe nice.\n', section);
    assert.ok(appended.startsWith('# Rules\n\nBe nice.\n\n<!-- kinetik-ui:start -->'));
    const updated = upsertSection(`${appended}\n## After\n`, agentsSection(defaults));
    assert.equal(updated.split('kinetik-ui:start').length, 2);
    assert.match(updated, /`components\/kinetik\/`/);
    assert.ok(updated.endsWith('## After\n'));
    assert.equal(upsertSection(updated, agentsSection(defaults)), updated);
  });

  it('matches the skill file shipped in the repository', () => {
    const shipped = fs.readFileSync(
      path.resolve(__dirname, '../../../skills/kinetik-ui/SKILL.md'),
      'utf8',
    );
    assert.equal(shipped.replace(/\r\n/g, '\n'), skillFile(defaults));
  });
});
