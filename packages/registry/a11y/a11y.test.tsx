/**
 * Accessibility audit: renders every demo (components and screen templates)
 * and checks the host tree a screen reader would see.
 *
 * - Every pressable element has a role.
 * - Every interactive element has an accessible name.
 * - Explicitly sized interactive elements are at least 44 pt, unless a hitSlop
 *   makes up the difference.
 * - Elements with custom actions handle them; adjustable elements can be
 *   incremented and decremented.
 * - Every demo renders with reduced motion forced on.
 */
import { act, render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defaultValues } from '../demo-kit/types';
import { demos } from '../demos.generated';
import { KinetikProvider } from '../shared/tokens/theme';
import { minTouchTarget } from '../shared/tokens/tokens';

const INTERACTIVE = new Set([
  'button',
  'link',
  'switch',
  'checkbox',
  'radio',
  'tab',
  'adjustable',
  'slider',
  'togglebutton',
  'menuitem',
]);

type Node = ReactTestRendererJSON;
type Issue = { rule: string; detail: string };

const isNode = (n: unknown): n is Node => typeof n === 'object' && n !== null && 'type' in n;

function textOf(node: Node | string): string {
  if (typeof node === 'string') return node;
  if (node.props.accessibilityElementsHidden) return '';
  return (node.children ?? [])
    .map((c) => (isNode(c) || typeof c === 'string' ? textOf(c) : ''))
    .join('');
}

function nameOf(node: Node): string {
  const p = node.props;
  return String(p.accessibilityLabel ?? p['aria-label'] ?? textOf(node)).trim();
}

function hidden(node: Node): boolean {
  const p = node.props;
  return (
    p.accessibilityElementsHidden === true ||
    p['aria-hidden'] === true ||
    p.importantForAccessibility === 'no-hide-descendants'
  );
}

function slop(value: unknown, side: 'v' | 'h'): number {
  if (typeof value === 'number') return value * 2;
  if (value && typeof value === 'object') {
    const s = value as Record<string, number | undefined>;
    return side === 'v' ? (s.top ?? 0) + (s.bottom ?? 0) : (s.left ?? 0) + (s.right ?? 0);
  }
  return 0;
}

export function audit(root: Node | Node[] | null): Issue[] {
  const issues: Issue[] = [];
  const visit = (node: Node) => {
    if (hidden(node)) return;
    const p = node.props;
    const role: string | undefined = p.accessibilityRole ?? p.role;
    const pressable = typeof p.onClick === 'function' || typeof p.onPress === 'function';
    const label = nameOf(node);

    if (pressable && p.accessible !== false && !role && node.type !== 'Text') {
      issues.push({ rule: 'pressable-has-role', detail: label || '(unnamed)' });
    }
    if (role && INTERACTIVE.has(role)) {
      if (!label) issues.push({ rule: 'interactive-has-name', detail: role });
      const style = StyleSheet.flatten(p.style) ?? {};
      const h = typeof style.height === 'number' ? style.height : undefined;
      const w = typeof style.width === 'number' ? style.width : undefined;
      if (h !== undefined && h + slop(p.hitSlop, 'v') < minTouchTarget) {
        issues.push({ rule: 'touch-target', detail: `${label || role}: height ${h}` });
      }
      if (w !== undefined && w + slop(p.hitSlop, 'h') < minTouchTarget) {
        issues.push({ rule: 'touch-target', detail: `${label || role}: width ${w}` });
      }
    }
    const actions: { name: string }[] = p.accessibilityActions ?? [];
    if (actions.length > 0) {
      if (typeof p.onAccessibilityAction !== 'function') {
        issues.push({ rule: 'actions-have-handler', detail: label || '(unnamed)' });
      }
      if (!label) issues.push({ rule: 'interactive-has-name', detail: 'element with actions' });
    }
    if (role === 'adjustable') {
      const names = actions.map((a) => a.name);
      if (!names.includes('increment') || !names.includes('decrement')) {
        issues.push({ rule: 'adjustable-actions', detail: label || '(unnamed)' });
      }
    }
    for (const child of node.children ?? []) if (isNode(child)) visit(child);
  };
  for (const n of Array.isArray(root) ? root : root ? [root] : []) visit(n);
  return issues;
}

describe('audit', () => {
  const issuesFor = async (ui: React.ReactElement) => {
    await render(ui);
    return audit(screen.toJSON() as Node | Node[] | null).map((i) => i.rule);
  };

  it('flags a pressable without a role', async () => {
    expect(
      await issuesFor(
        <Pressable onPress={() => {}}>
          <Text>Go</Text>
        </Pressable>,
      ),
    ).toEqual(['pressable-has-role']);
  });

  it('flags an interactive element without a name', async () => {
    expect(await issuesFor(<Pressable accessibilityRole="button" onPress={() => {}} />)).toEqual([
      'interactive-has-name',
    ]);
  });

  it('flags small targets unless hitSlop covers them', async () => {
    expect(
      await issuesFor(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => {}}
          style={{ width: 24, height: 24 }}
        />,
      ),
    ).toEqual(['touch-target', 'touch-target']);
    expect(
      await issuesFor(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => {}}
          hitSlop={10}
          style={{ width: 24, height: 24 }}
        />,
      ),
    ).toEqual([]);
  });

  it('flags an adjustable element without increment and decrement', async () => {
    expect(
      await issuesFor(
        <View accessible accessibilityRole="adjustable" accessibilityLabel="Volume" />,
      ),
    ).toEqual(['adjustable-actions']);
  });

  it('ignores hidden subtrees and accepts text as the name', async () => {
    expect(
      await issuesFor(
        <View>
          <View accessibilityElementsHidden>
            <Pressable onPress={() => {}} />
          </View>
          <Pressable accessibilityRole="button" onPress={() => {}}>
            <Text>Save</Text>
          </Pressable>
        </View>,
      ),
    ).toEqual([]);
  });
});

describe.each(demos.map((d) => [d.name, d] as const))('%s', (_name, entry) => {
  const { Demo } = entry;
  const props = defaultValues(entry.controls);

  it('exposes roles, names and touch targets', async () => {
    await render(
      <KinetikProvider>
        <Demo {...props} />
      </KinetikProvider>,
    );
    await act(async () => {});
    expect(audit(screen.toJSON() as Node | Node[] | null)).toEqual([]);
  });

  it('renders with reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <Demo {...props} />
      </KinetikProvider>,
    );
    await act(async () => {});
    expect(screen.toJSON()).not.toBeNull();
  });
});
