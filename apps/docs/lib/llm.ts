import fs from 'node:fs';
import path from 'node:path';

import {
  SITE,
  allComponents,
  byCategory,
  describeMeasurement,
  getComponent,
  type ComponentDoc,
} from './data';

/**
 * Plain-markdown versions of the docs for AI agents: /llms.txt, /llms-full.txt
 * and a `.md` twin of every page (also served for `Accept: text/markdown`).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kinetik-ui.dev').replace(
  /\/$/,
  '',
);

const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``;

function escapeCell(text: string) {
  // Backslashes first, so the escapes added for pipes are not themselves escaped.
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function gettingStartedMarkdown(): string {
  const source = fs.readFileSync(path.join(process.cwd(), 'content', 'getting-started.md'), 'utf8');
  return `# Getting started\n\nAdd motion components to an Expo app in two commands.\n\n${source.trim()}\n`;
}

export function componentMarkdown(doc: ComponentDoc, { source = true } = {}): string {
  const parts = [
    `# ${doc.title}`,
    `> ${doc.description}`,
    [
      `- Category: ${doc.categoryTitle}`,
      `- Version: ${doc.version}`,
      `- Platforms: iOS, Android${doc.web === 'live' ? ', web' : ` (web: ${doc.webNote ?? 'device only'})`}`,
      `- Dependencies: ${doc.dependencies.map((d) => `\`${d}\``).join(', ') || 'none'}`,
      `- Requires: React Native New Architecture (Reanimated 4)`,
    ].join('\n'),
    `## Install\n\n${fence('bash', doc.install.cli)}\n\nWith the shadcn CLI:\n\n${fence('bash', doc.install.shadcn)}`,
    doc.docs.trim(),
  ];

  for (const table of doc.propsTables) {
    const rows = table.props.map(
      (p) =>
        `| \`${p.name}\`${p.required ? '' : '?'} | \`${escapeCell(p.type)}\` | ${p.default ? `\`${escapeCell(p.default)}\`` : ''} | ${escapeCell(p.description)} |`,
    );
    parts.push(
      `## ${table.name}\n\n| Prop | Type | Default | Description |\n| --- | --- | --- | --- |\n${rows.join('\n')}`,
    );
  }

  parts.push(
    [
      '## Accessibility',
      '',
      `- Reduced motion: ${doc.a11y.reducedMotion}`,
      `- Screen readers: ${doc.a11y.screenReader}`,
      `- Touch target: ${doc.a11y.touchTarget}`,
    ].join('\n'),
    [
      `## Performance\n\n${doc.perf.budget}\n`,
      ...doc.perf.measurements.map((m) => `- Measured: ${describeMeasurement(m)}`),
      ...(doc.perf.measurements.some((m) => m.kind === 'device')
        ? []
        : ['- Real-device measurement pending.']),
    ].join('\n'),
  );

  if (source) {
    parts.push(
      `## Source\n\n${doc.source.map((f) => `\`${f.path}\`\n\n${fence('tsx', f.content)}`).join('\n\n')}`,
    );
  }
  return `${parts.join('\n\n')}\n`;
}

export function indexMarkdown(): string {
  const groups = byCategory().map(
    (g) =>
      `## ${g.items[0]!.categoryTitle}\n\n${g.items
        .map((c) => `- [${c.title}](${SITE_URL}/components/${c.name}.md): ${c.description}`)
        .join('\n')}`,
  );
  return `# ${SITE.name}\n\n> ${SITE.description}\n\n${groups.join('\n\n')}\n`;
}

export function llmsTxt(): string {
  const components = byCategory().flatMap((g) =>
    g.items.map(
      (c) =>
        `- [${c.title}](${SITE_URL}/components/${c.name}.md): ${c.description}${c.web === 'live' ? '' : ' (device only)'}`,
    ),
  );
  return `# ${SITE.name}

> ${SITE.description}

Components are copied into the app as TypeScript source (shadcn-style registry). Install with \`npx kinetik-ui add <name>\`, which runs \`npx expo install\` so native dependency versions match the Expo SDK. Needs the New Architecture (Reanimated 4), Gesture Handler and, for some components, Skia. Every component honours reduced motion and reads colours from \`useKinetikTheme()\`.

Agents can also connect to the MCP server: \`npx kinetik-ui mcp\` (tools: list_components, search_components, get_component, get_install_plan, get_tokens).

## Docs

- [Getting started](${SITE_URL}/docs/getting-started.md): requirements, \`init\`, \`add\`, theming and the CLI.
- [Full docs in one file](${SITE_URL}/llms-full.txt): every component's guide, props and accessibility notes.

## Components

${components.join('\n')}

## Registry

- [registry.json](${SITE_URL}/r/registry.json): shadcn-compatible index; each item at /r/<name>.json with full source.
`;
}

export function llmsFullTxt(): string {
  return [
    llmsTxt().trim(),
    gettingStartedMarkdown().trim(),
    ...allComponents.map((c) => componentMarkdown(c, { source: false }).trim()),
  ].join('\n\n---\n\n');
}

/** The markdown twin of a site path (`/`, `/docs/getting-started`, `/components/x`). */
export function markdownFor(pathname: string): string | null {
  const clean = pathname.replace(/\.md$/, '').replace(/\/$/, '') || '/';
  if (clean === '/' || clean === '/index') return indexMarkdown();
  if (clean === '/docs/getting-started') return gettingStartedMarkdown();
  const match = /^\/components\/([a-z0-9-]+)$/.exec(clean);
  const doc = match ? getComponent(match[1]!) : undefined;
  return doc ? componentMarkdown(doc) : null;
}

export function markdownPaths(): string[] {
  return ['index', 'docs/getting-started', ...allComponents.map((c) => `components/${c.name}`)];
}

export const MARKDOWN_HEADERS = {
  'content-type': 'text/markdown; charset=utf-8',
  vary: 'accept',
};
