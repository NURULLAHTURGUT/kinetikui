import { useState } from 'react';
import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { DockBar, type DockItem } from './dock-bar';

export const controls = defineControls({
  magnification: {
    type: 'number',
    label: 'Magnification',
    min: 1,
    max: 2.2,
    step: 0.1,
    default: 1.6,
  },
  itemSize: { type: 'number', label: 'Item size (pt)', min: 40, max: 60, step: 2, default: 48 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const ITEMS: DockItem[] = [
  { key: 'home', label: 'Home', icon: ({ color }) => <DemoIcon name="home" color={color} /> },
  { key: 'search', label: 'Search', icon: ({ color }) => <DemoIcon name="search" color={color} /> },
  { key: 'new', label: 'New post', icon: ({ color }) => <DemoIcon name="create" color={color} /> },
  { key: 'inbox', label: 'Inbox', icon: ({ color }) => <DemoIcon name="inbox" color={color} /> },
  { key: 'profile', label: 'Profile', icon: ({ color }) => <DemoIcon name="user" color={color} /> },
];

export default function DockBarDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [tab, setTab] = useState('home');
  const label = ITEMS.find((i) => i.key === tab)?.label;

  return (
    <View style={{ gap: space[10], paddingTop: space[16], paddingBottom: space[4] }}>
      <View style={{ alignItems: 'center', gap: space[1] }}>
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
          {label}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Slide a finger along the dock
        </Text>
      </View>
      <DockBar {...props} items={ITEMS} value={tab} onChange={setTab} accessibilityLabel="Main" />
    </View>
  );
}
