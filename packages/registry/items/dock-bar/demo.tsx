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

/*
 * Line icons on a 22 pt grid with a 2 pt stroke, built from plain views so the
 * demo needs no icon library. Swap in your own icon set.
 */
const STROKE = 2;

const Home = ({ color }: { color: string }) => (
  <View style={styles.icon}>
    <View style={[styles.roof, { borderColor: color }]} />
    <View style={[styles.house, { borderColor: color }]} />
    <View style={[styles.door, { backgroundColor: color }]} />
  </View>
);
const Search = ({ color }: { color: string }) => (
  <View style={styles.icon}>
    <View style={[styles.lens, { borderColor: color }]} />
    <View style={[styles.handle, { backgroundColor: color }]} />
  </View>
);
const Create = ({ color }: { color: string }) => (
  <View style={styles.icon}>
    <View style={[styles.square, { borderColor: color }]} />
    <View style={[styles.plusH, { backgroundColor: color }]} />
    <View style={[styles.plusV, { backgroundColor: color }]} />
  </View>
);
const Mail = ({ color }: { color: string }) => (
  <View style={styles.icon}>
    <View style={[styles.envelope, { borderColor: color }]}>
      <View style={[styles.flap, { borderColor: color }]} />
    </View>
  </View>
);
const Profile = ({ color }: { color: string }) => (
  <View style={styles.icon}>
    <View style={[styles.head, { borderColor: color }]} />
    <View style={[styles.shoulders, { borderColor: color }]} />
  </View>
);

const ITEMS: DockItem[] = [
  { key: 'home', label: 'Home', icon: ({ color }) => <Home color={color} /> },
  { key: 'search', label: 'Search', icon: ({ color }) => <Search color={color} /> },
  { key: 'new', label: 'New post', icon: ({ color }) => <Create color={color} /> },
  { key: 'inbox', label: 'Inbox', icon: ({ color }) => <Mail color={color} /> },
  { key: 'profile', label: 'Profile', icon: ({ color }) => <Profile color={color} /> },
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

const styles = StyleSheet.create({
  icon: { width: 22, height: 22 },
  // Home: a chevron roof over an open-topped body with a door.
  roof: {
    position: 'absolute',
    left: 4.5,
    top: 4,
    width: 13,
    height: 13,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  house: {
    position: 'absolute',
    left: 4.5,
    top: 9,
    width: 13,
    height: 11,
    borderWidth: STROKE,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  door: { position: 'absolute', left: 10, top: 14, width: STROKE, height: 5, borderRadius: 1 },
  // Search: a lens and a handle at 45°.
  lens: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: STROKE,
  },
  handle: {
    position: 'absolute',
    left: 15,
    top: 13,
    width: STROKE,
    height: 7,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },
  // New: a rounded square with a plus.
  square: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: STROKE,
  },
  plusH: { position: 'absolute', left: 7, top: 10, width: 8, height: STROKE, borderRadius: 1 },
  plusV: { position: 'absolute', left: 10, top: 7, width: STROKE, height: 8, borderRadius: 1 },
  // Inbox: an envelope with its flap.
  envelope: {
    position: 'absolute',
    left: 1.5,
    top: 4,
    width: 19,
    height: 14,
    borderRadius: 3.5,
    borderWidth: STROKE,
    overflow: 'hidden',
    alignItems: 'center',
  },
  flap: {
    width: 11,
    height: 11,
    marginTop: -7.5,
    borderRightWidth: STROKE,
    borderBottomWidth: STROKE,
    borderBottomRightRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  // Profile: a head over rounded shoulders.
  head: {
    position: 'absolute',
    left: 7,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: STROKE,
  },
  shoulders: {
    position: 'absolute',
    left: 3,
    top: 12.5,
    width: 16,
    height: 8,
    borderWidth: STROKE,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});
