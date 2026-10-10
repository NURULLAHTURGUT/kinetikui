/**
 * Generates the docs site's data from the registry (nothing is written by hand):
 *
 *   apps/docs/generated/components.json   per-component docs: meta, props, source, markdown
 *   apps/docs/generated/tokens.css         CSS variables for both palettes
 *   apps/docs/public/canvaskit.wasm        Skia's web runtime, copied from node_modules
 *   apps/docs/public/canvaskit-LICENSE.txt its BSD-3-Clause notice
 *   apps/docs/public/r/                    the built registry (run build:registry first),
 *                                          served at /r for the CLI, shadcn and MCP
 *
 * Props tables come from the TypeScript types and their JSDoc, and defaults
 * from the component's destructured parameters, so the docs cannot drift from
 * the code.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { palettes } from '../packages/registry/shared/tokens/tokens';
import {
  CATEGORIES,
  REGISTRY_URL,
  ROOT,
  buildItems,
  installDependencies,
  type BuiltItem,
} from './lib/registry';

const OUT = path.join(ROOT, 'apps', 'docs', 'generated');

export type PropDoc = {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
};

export type PropsTable = { name: string; props: PropDoc[] };

export type ComponentDoc = {
  name: string;
  title: string;
  description: string;
  category: keyof typeof CATEGORIES;
  categoryTitle: string;
  phase: number;
  version: string;
  web: 'live' | 'device-only';
  webNote?: string;
  dependencies: string[];
  registryDependencies: string[];
  install: { cli: string; shadcn: string };
  perf: BuiltItem['meta'] extends infer M ? (M extends { perf: infer P } ? P : never) : never;
  a11y: { reducedMotion: string; screenReader: string; touchTarget: string };
  docs: string;
  source: { path: string; content: string }[];
  propsTables: PropsTable[];
  /** The demo's control definitions (from `defineControls({...})` in demo.tsx). */
  controls: Record<string, unknown>;
};

/** Reads the literal passed to `defineControls` in a demo without executing the demo. */
function extractControls(file: string): Record<string, unknown> {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  let literal: string | null = null;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineControls' &&
      node.arguments[0]
    ) {
      literal = node.arguments[0].getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!literal) return {};
  // The literal is plain data (strings, numbers, booleans, arrays).
  return new Function(`return (${literal});`)() as Record<string, unknown>;
}

/** Exported `*Props` / `*Options` types in a file, with their own (not inherited) members. */
function extractProps(file: string): PropsTable[] {
  const program = ts.createProgram([file], {
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  if (!source) return [];

  // Defaults from `function X({ a = 1, b = 'x' }: XProps)`.
  const defaults = new Map<string, Map<string, string>>();
  const collectDefaults = (fn: ts.FunctionDeclaration) => {
    const param = fn.parameters[0];
    if (
      !param?.type ||
      !ts.isTypeReferenceNode(param.type) ||
      !ts.isObjectBindingPattern(param.name)
    )
      return;
    const typeName = param.type.typeName.getText(source);
    const map = new Map<string, string>();
    for (const el of param.name.elements) {
      const key = (el.propertyName ?? el.name).getText(source);
      if (el.initializer) map.set(key, el.initializer.getText(source));
    }
    defaults.set(typeName, map);
  };
  ts.forEachChild(source, (node) => {
    if (ts.isFunctionDeclaration(node)) collectDefaults(node);
  });

  const tables: PropsTable[] = [];
  ts.forEachChild(source, (node) => {
    if (!ts.isTypeAliasDeclaration(node) && !ts.isInterfaceDeclaration(node)) return;
    const name = node.name.text;
    const exported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported || !/(Props|Options)$/.test(name)) return;
    const type = checker.getTypeAtLocation(node.name);
    const props: PropDoc[] = [];
    for (const symbol of type.getProperties()) {
      // Only document members declared in this file; inherited ViewProps etc. are noise.
      const decl = symbol.declarations?.[0];
      if (!decl || decl.getSourceFile().fileName !== source.fileName) continue;
      const propType = checker.getTypeOfSymbolAtLocation(symbol, node);
      const optional = (symbol.flags & ts.SymbolFlags.Optional) !== 0;
      let typeText = checker.typeToString(
        optional ? checker.getNonNullableType(propType) : propType,
        node,
        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType,
      );
      if (ts.isPropertySignature(decl) && decl.type) {
        // Prefer the type as written (keeps aliases like StyleProp<ViewStyle> readable).
        typeText = decl.type.getText(source).replace(/\s+/g, ' ');
      }
      props.push({
        name: symbol.getName(),
        type: typeText,
        required: !optional,
        ...(defaults.get(name)?.has(symbol.getName())
          ? { default: defaults.get(name)!.get(symbol.getName())! }
          : null),
        description: ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim(),
      });
    }
    if (props.length)
      tables.push({ name, props: props.sort((a, b) => Number(b.required) - Number(a.required)) });
  });
  return tables;
}

function tokensCss(): string {
  const toVars = (p: Record<string, string>) =>
    Object.entries(p)
      .map(([k, v]) => `  --k-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${v};`)
      .join('\n');
  return [
    '/* Generated by scripts/build-docs.ts from shared/tokens/tokens.ts. */',
    `:root, [data-theme='dark'] {\n  color-scheme: dark;\n${toVars(palettes.dark)}\n}`,
    `[data-theme='light'] {\n  color-scheme: light;\n${toVars(palettes.light)}\n}`,
    `@media (prefers-color-scheme: light) {\n  :root:not([data-theme='dark']) {\n  color-scheme: light;\n${toVars(palettes.light)}\n  }\n}`,
    '',
  ].join('\n\n');
}

const items = buildItems();
const docs: ComponentDoc[] = items
  .filter((i) => i.kind !== 'shared' && i.meta && i.dir)
  .map((item) => {
    const meta = item.meta!;
    const main = path.join(item.dir!, `${item.name}.tsx`);
    return {
      name: item.name,
      title: item.title,
      description: item.description,
      category: meta.category,
      categoryTitle: CATEGORIES[meta.category],
      phase: meta.phase,
      version: item.version,
      web: meta.web,
      ...(meta.webNote ? { webNote: meta.webNote } : null),
      dependencies: installDependencies(item.dependencies),
      registryDependencies: item.registryDependencies,
      install: {
        cli: `npx kinetik-ui add ${item.name}`,
        shadcn: `npx shadcn@latest add ${REGISTRY_URL}/r/${item.name}.json`,
      },
      perf: meta.perf,
      a11y: meta.a11y,
      docs: fs.readFileSync(path.join(item.dir!, 'docs.mdx'), 'utf8').replace(/\r\n/g, '\n'),
      source: item.builtFiles.map((f) => ({
        path: f.target.replace(/^~\//, ''),
        content: f.content,
      })),
      propsTables: extractProps(main),
      controls: extractControls(path.join(item.dir!, 'demo.tsx')),
    };
  });

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'components.json'), `${JSON.stringify(docs, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'tokens.css'), tokensCss());
fs.copyFileSync(
  path.join(ROOT, 'node_modules', 'canvaskit-wasm', 'bin', 'full', 'canvaskit.wasm'),
  path.join(ROOT, 'apps', 'docs', 'public', 'canvaskit.wasm'),
);
// CanvasKit is BSD-3-Clause: its notice travels with the binary we serve.
fs.copyFileSync(
  path.join(ROOT, 'node_modules', 'canvaskit-wasm', 'LICENSE'),
  path.join(ROOT, 'apps', 'docs', 'public', 'canvaskit-LICENSE.txt'),
);
fs.rmSync(path.join(ROOT, 'apps', 'docs', 'public', 'r'), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public', 'r'), path.join(ROOT, 'apps', 'docs', 'public', 'r'), {
  recursive: true,
});
const propCount = docs.reduce(
  (n, d) => n + d.propsTables.reduce((m, t) => m + t.props.length, 0),
  0,
);
console.log(`Docs data: ${docs.length} components, ${propCount} documented props.`);
