import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { before, describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer, scoreItem, type RegistryItem, type RegistrySource } from './index';

/** Reads the built registry (public/r) the same way the CLI does for a local directory. */
const DIR = path.resolve(__dirname, '../../../public/r');
const read = async (file: string) => JSON.parse(await fs.readFile(path.join(DIR, file), 'utf8'));

const registry: RegistrySource = {
  index: () => read('registry.json'),
  item: (name) => read(`${name}.json`),
  async resolve(names) {
    const seen = new Set<string>();
    const order: RegistryItem[] = [];
    const visit = async (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      const item: RegistryItem = await read(`${name}.json`);
      for (const dep of item.registryDependencies ?? [])
        await visit(
          dep
            .split('/')
            .pop()!
            .replace(/\.json$/, ''),
        );
      order.push(item);
    };
    for (const name of names) await visit(name);
    return order;
  },
};

type TextResult = { content: { type: string; text: string }[]; isError?: boolean };

describe('kinetik MCP server', () => {
  let client: Client;
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as TextResult;
    const text = result.content[0]!.text;
    return { result, text, json: () => JSON.parse(text) };
  };

  before(async () => {
    const server = createServer({ registry, installed: async () => ({ 'glint-card': '0.1.0' }) });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  });

  it('advertises the five tools and usage instructions', async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      'get_component',
      'get_install_plan',
      'get_tokens',
      'list_components',
      'search_components',
    ]);
    assert.ok(tools.every((t) => t.annotations?.readOnlyHint));
    assert.match(client.getInstructions() ?? '', /npx expo install/);
  });

  it('lists every component and screen template, and filters by category', async () => {
    const all = (await call('list_components')).json();
    const index = await registry.index();
    assert.equal(all.length, index.items.filter((i) => i.meta?.kind !== 'shared').length);
    assert.ok(all.filter((c: { kind: string }) => c.kind === 'component').length >= 24);
    const screens = (await call('list_components', { category: 'screen' })).json();
    assert.ok(screens.every((c: { kind: string }) => c.kind === 'template'));
    assert.ok(all.every((c: { name: string }) => !c.name.startsWith('kinetik-')));
    const text = (await call('list_components', { category: 'text' })).json();
    assert.ok(text.length > 0);
    assert.ok(text.every((c: { category: string }) => c.category === 'text'));
  });

  it('ranks name matches first when searching', async () => {
    const hits = (await call('search_components', { query: 'toast' })).json();
    assert.equal(hits[0].name, 'toast-stack');
    const none = await call('search_components', { query: 'zzzz-nothing' });
    assert.match(none.text, /No components match/);
  });

  it('returns a component with guide, a11y notes and source', async () => {
    const card = (await call('get_component', { name: 'glint-card' })).json();
    assert.equal(card.title, 'Glint Card');
    assert.match(card.guide, /## When not to use/);
    assert.ok(card.accessibility.reducedMotion);
    assert.ok(card.registryDependencies.includes('kinetik-tokens'));
    assert.match(card.files[0].content, /export function GlintCard/);
    const lean = (await call('get_component', { name: 'glint-card', includeSource: false })).json();
    assert.equal(lean.files[0].content, undefined);
  });

  it('plans an install with expo install and setup notes', async () => {
    const plan = (
      await call('get_install_plan', { components: ['deckfall', 'glint-card'] })
    ).json();
    assert.deepEqual(plan.commands, ['npx kinetik-ui add deckfall']);
    assert.deepEqual(plan.alreadyInstalled, ['glint-card']);
    assert.ok(plan.dependencies.includes('react-native-gesture-handler'));
    assert.match(plan.expoInstall, /^npx expo install /);
    assert.ok(plan.notes.some((n: string) => n.includes('GestureHandlerRootView')));
    assert.ok(plan.files.some((f: { target: string }) => f.target.endsWith('deckfall.tsx')));
  });

  it('refuses install plans for invalid names or unsafe dependencies', async () => {
    const bad = await call('get_install_plan', { components: ['../secret'] });
    assert.equal(bad.result.isError, true);
    assert.match(bad.text, /not a valid component name/);

    const tampered = createServer({
      registry: {
        ...registry,
        resolve: async () => [
          { name: 'x', type: 'registry:item', dependencies: ['ok & calc'], files: [] },
        ],
      },
      installed: async () => ({}),
    });
    const [c, s] = InMemoryTransport.createLinkedPair();
    const other = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([tampered.connect(s), other.connect(c)]);
    const res = (await other.callTool({
      name: 'get_install_plan',
      arguments: { components: ['x'] },
    })) as TextResult;
    assert.equal(res.isError, true);
    assert.match(res.content[0]!.text, /invalid package name/);
  });

  it('returns tokens and motion source', async () => {
    const tokens = (await call('get_tokens')).json();
    const targets = tokens.files.map((f: { target: string }) => f.target).join(' ');
    assert.match(targets, /tokens\.ts/);
    assert.match(targets, /motion\.ts/);
  });

  it('reports unknown components as tool errors', async () => {
    const { result } = await call('get_component', { name: 'nope' });
    assert.equal(result.isError, true);
  });

  it('scores multi-word queries only when every word matches', () => {
    const item = { name: 'hold-to-confirm', title: 'Hold to Confirm', files: [] };
    assert.ok(scoreItem(item, 'hold confirm') > 0);
    assert.equal(scoreItem(item, 'hold banana'), 0);
  });
});
