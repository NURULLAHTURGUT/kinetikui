import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TreeView, type TreeNode } from './tree-view';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const FILES: TreeNode[] = [
  {
    id: 'app',
    label: 'app',
    children: [
      { id: 'layout', label: '_layout.tsx', detail: '1.8 KB' },
      {
        id: 'tabs',
        label: '(tabs)',
        children: [
          { id: 'home', label: 'index.tsx', detail: '4.2 KB' },
          { id: 'search', label: 'search.tsx', detail: '3.1 KB' },
          { id: 'profile', label: 'profile.tsx', detail: '2.6 KB' },
        ],
      },
      {
        id: 'settings',
        label: 'settings',
        children: [
          { id: 'account', label: 'account.tsx', detail: '2.0 KB' },
          { id: 'privacy', label: 'privacy.tsx', detail: '1.4 KB' },
        ],
      },
    ],
  },
  {
    id: 'components',
    label: 'components',
    children: [
      {
        id: 'kinetik',
        label: 'kinetik',
        children: [
          { id: 'tree', label: 'tree-view.tsx', detail: '6.4 KB' },
          { id: 'dock', label: 'dock-bar.tsx', detail: '5.9 KB' },
        ],
      },
      { id: 'header', label: 'header.tsx', detail: '1.1 KB' },
    ],
  },
  { id: 'package', label: 'package.json', detail: '0.9 KB' },
];

export default function TreeViewDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, radius, space } = useKinetikTheme();
  const [selected, setSelected] = useState('home');
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space[2],
      }}
    >
      <TreeView
        data={FILES}
        defaultExpanded={['app', 'tabs']}
        selected={selected}
        onSelect={(node) => setSelected(node.id)}
        haptics={haptics}
      />
    </View>
  );
}
