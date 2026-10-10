import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

/* Simple geometric glyphs so the demo needs no icon library. */
const Home = ({ color }: { color: string }) => (
  <View style={[styles.home, { borderColor: color }]} />
);
const Search = ({ color }: { color: string }) => (
  <View style={[styles.ring, { borderColor: color }]} />
);
const Plus = ({ color }: { color: string }) => (
  <View>
    <View style={[styles.barH, { backgroundColor: color }]} />
    <View style={[styles.barV, { backgroundColor: color }]} />
  </View>
);
const Inbox = ({ color }: { color: string }) => (
  <View style={[styles.inbox, { borderColor: color }]} />
);
const Profile = ({ color }: { color: string }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    <View style={[styles.head, { backgroundColor: color }]} />
    <View style={[styles.body, { backgroundColor: color }]} />
  </View>
);

const ITEMS: DockItem[] = [
  { key: 'home', label: 'Home', icon: ({ color }) => <Home color={color} /> },
  { key: 'search', label: 'Search', icon: ({ color }) => <Search color={color} /> },
  { key: 'new', label: 'New post', icon: ({ color }) => <Plus color={color} /> },
  { key: 'inbox', label: 'Inbox', icon: ({ color }) => <Inbox color={color} /> },
  { key: 'profile', label: 'Profile', icon: ({ color }) => <Profile color={color} /> },
];

export default function DockBarDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [tab, setTab] = useState('home');
  const label = ITEMS.find((i) => i.key === tab)?.label;

  return (
    <View style={{ gap: space[10], paddingTop: space[16], paddingBottom: space[4] }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        {label} · slide a finger along the dock
      </Text>
      <DockBar {...props} items={ITEMS} value={tab} onChange={setTab} accessibilityLabel="Main" />
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    width: 18,
    height: 16,
    borderWidth: 2.5,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderRadius: 3,
  },
  ring: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5 },
  barH: { width: 18, height: 2.5, borderRadius: 2, position: 'absolute', top: 7.75 },
  barV: { width: 2.5, height: 18, borderRadius: 2, marginLeft: 7.75 },
  inbox: { width: 20, height: 14, borderRadius: 3, borderWidth: 2.5 },
  head: { width: 9, height: 9, borderRadius: 5 },
  body: { width: 16, height: 7, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
});
