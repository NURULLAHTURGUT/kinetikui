import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

/* ------------------------------------------------------------------------- */
/* Registry shapes (the subset of the shadcn-compatible JSON the server needs) */
/* ------------------------------------------------------------------------- */

export type RegistryFile = { path: string; type: string; target: string; content?: string };

export type RegistryItem = {
  name: string;
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
    platforms?: string[];
    guide?: string;
    perf?: { budget?: string };
    a11y?: { reducedMotion?: string; screenReader?: string; touchTarget?: string };
  };
};

/** Where component data comes from. The CLI passes its registry client. */
export type RegistrySource = {
  index(): Promise<{ items: RegistryItem[] }>;
  item(name: string): Promise<RegistryItem>;
  /** The items and everything they depend on, dependencies first. */
  resolve(names: string[]): Promise<RegistryItem[]>;
};

export type ServerOptions = {
  registry: RegistrySource;
  /** Reports whether a component is already installed in the user's project. */
  installed?: () => Promise<Record<string, string>>;
  version?: string;
};

const CATEGORIES = [
  'background',
  'card',
  'interaction',
  'text',
  'navigation',
  'feedback',
  'screen',
] as const;

export const INSTRUCTIONS = `Kinetik UI is a library of motion and effect components for Expo / React Native (Reanimated 4, Gesture Handler, Skia). Components are copied into the user's project as source with the kinetik-ui CLI, which installs dependencies with \`npx expo install\` so native versions match the Expo SDK.

Guidelines when building with Kinetik:
- Find components with search_components or list_components, read one with get_component, and install with the commands from get_install_plan. Do not hand-copy files when the CLI is available.
- Requires the React Native New Architecture (Reanimated 4). Gesture-driven components need the app wrapped in <GestureHandlerRootView style={{ flex: 1 }}>.
- Use colours, spacing and type from useKinetikTheme() (see get_tokens); do not hard-code colours.
- Every component supports reduced motion; keep that behaviour when editing copied files.
- Prefer one expressive component per screen; motion should explain, not decorate.`;

const text = (value: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    },
  ],
});

function summary(item: RegistryItem) {
  return {
    name: item.name,
    kind: item.meta?.kind,
    title: item.title,
    description: item.description,
    category: item.meta?.category ?? item.categories?.[0],
    web: item.meta?.web,
    version: item.meta?.version,
  };
}

/** Scores an item against a query: name hits beat title hits beat description hits. */
export function scoreItem(item: RegistryItem, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const term of terms) {
    const fields: [string, number][] = [
      [item.name.toLowerCase(), 6],
      [(item.title ?? '').toLowerCase(), 5],
      [(item.meta?.category ?? '').toLowerCase(), 3],
      [(item.description ?? '').toLowerCase(), 2],
      [(item.meta?.guide ?? '').toLowerCase(), 1],
    ];
    const hit = fields.find(([field]) => field.includes(term));
    if (!hit) return 0;
    total += hit[1] + (item.name === term ? 4 : 0);
  }
  return total;
}

/**
 * npm package names (optional version range) without spaces or shell
 * characters. The plan's commands get run by an agent in a shell, so a
 * registry that declares anything else is refused rather than echoed.
 */
const PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[a-z0-9.^~*+-]+)?$/;
const ITEM_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Commands and notes to install components into an Expo project. */
export async function installPlan(
  registry: RegistrySource,
  names: string[],
  installed: Record<string, string> = {},
) {
  const badName = names.find((n) => !ITEM_NAME.test(n));
  if (badName) throw new Error(`"${badName}" is not a valid component name.`);
  const items = await registry.resolve(names);
  const components = items.filter((i) => i.meta?.kind !== 'shared');
  const dependencies = [...new Set(items.flatMap((i) => i.dependencies ?? []))].sort();
  const badDep = dependencies.find((d) => !PACKAGE_SPEC.test(d));
  if (badDep)
    throw new Error(`The registry declares an invalid package name: ${JSON.stringify(badDep)}`);
  const missing = names.filter((n) => !installed[n]);
  const needsInit = Object.keys(installed).length === 0;
  const notes: string[] = [];
  if (dependencies.includes('react-native-gesture-handler')) {
    notes.push(
      'Wrap the app root in <GestureHandlerRootView style={{ flex: 1 }}> (react-native-gesture-handler).',
    );
  }
  if (dependencies.includes('@shopify/react-native-skia')) {
    notes.push(
      'Uses Skia: needs a development build (not Expo Go on all SDKs); on the web, load CanvasKit before rendering.',
    );
  }
  if (dependencies.includes('react-native-safe-area-context')) {
    notes.push('Render inside a <SafeAreaProvider> (expo-router apps already have one).');
  }
  if (names.includes('morph-sheet')) {
    notes.push(
      'MorphSheet wraps the screen it covers: pass the screen as children so Android can blur it.',
    );
  }
  notes.push(
    'Optional: wrap the app in <KinetikProvider> to force a scheme, brand colours or turn off haptics.',
  );
  return {
    commands: [
      ...(needsInit ? ['npx kinetik-ui init'] : []),
      `npx kinetik-ui add ${(missing.length ? missing : names).join(' ')}`,
    ],
    alreadyInstalled: names.filter((n) => installed[n]),
    dependencies,
    expoInstall: dependencies.length ? `npx expo install ${dependencies.join(' ')}` : null,
    files: items.flatMap((i) => i.files.map((f) => ({ item: i.name, target: f.target }))),
    components: components.map(summary),
    notes,
  };
}

export function createServer({ registry, installed, version = '0.1.0' }: ServerOptions): McpServer {
  const server = new McpServer({ name: 'kinetik-ui', version }, { instructions: INSTRUCTIONS });

  const components = async () =>
    (await registry.index()).items.filter((i) => i.meta?.kind !== 'shared');

  server.registerTool(
    'list_components',
    {
      title: 'List Kinetik components',
      description:
        'Lists every Kinetik UI component and screen template (category "screen") with a one-line description.',
      inputSchema: { category: z.enum(CATEGORIES).optional().describe('Only this category') },
      annotations: { readOnlyHint: true },
    },
    async ({ category }) => {
      const all = await components();
      return text(all.filter((c) => !category || c.meta?.category === category).map(summary));
    },
  );

  server.registerTool(
    'search_components',
    {
      title: 'Search Kinetik components',
      description:
        'Finds components by name, category or what they do (e.g. "swipe cards", "loading").',
      inputSchema: { query: z.string().min(1).describe('Words describing the component you need') },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => {
      const hits = (await components())
        .map((item) => ({ item, s: scoreItem(item, query) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => summary(r.item));
      return text(hits.length ? hits : `No components match "${query}". Try list_components.`);
    },
  );

  server.registerTool(
    'get_component',
    {
      title: 'Get a Kinetik component',
      description:
        "Returns a component's usage guide, accessibility and performance notes, dependencies and full source files.",
      inputSchema: {
        name: z.string().describe('Component name, e.g. "glint-card"'),
        includeSource: z.boolean().default(true).describe('Include file contents'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ name, includeSource }) => {
      const item = await registry.item(name);
      const closure = await registry.resolve([name]);
      return text({
        ...summary(item),
        dependencies: item.dependencies ?? [],
        registryDependencies: closure.filter((i) => i.name !== name).map((i) => i.name),
        guide: item.meta?.guide,
        accessibility: item.meta?.a11y,
        performance: item.meta?.perf,
        files: item.files.map((f) => ({
          target: f.target,
          ...(includeSource ? { content: f.content } : null),
        })),
      });
    },
  );

  server.registerTool(
    'get_install_plan',
    {
      title: 'Plan a Kinetik install',
      description:
        'Returns the commands to add components to an Expo project, the dependencies they bring and setup notes.',
      inputSchema: {
        components: z.array(z.string()).min(1).describe('Component names to install'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ components: names }) =>
      text(await installPlan(registry, names, (await installed?.()) ?? {})),
  );

  server.registerTool(
    'get_tokens',
    {
      title: 'Get Kinetik design tokens',
      description:
        'Returns the token and motion source: palettes (dark/light), spacing, radius, type, shadows, springs and durations.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [tokens, motion] = await Promise.all([
        registry.item('kinetik-tokens'),
        registry.item('kinetik-motion'),
      ]);
      return text({
        usage:
          'Read values with useKinetikTheme(); pick motion with spring(name, reduced) and timing(name, reduced).',
        files: [...tokens.files, ...motion.files].map((f) => ({
          target: f.target,
          content: f.content,
        })),
      });
    },
  );

  return server;
}

/** Runs the server over stdio (what `npx kinetik-ui mcp` does). */
export async function startStdioServer(options: ServerOptions): Promise<void> {
  const server = createServer(options);
  await server.connect(new StdioServerTransport());
}
