import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PopMenu } from './pop-menu';

export const controls = defineControls({
  align: { type: 'select', label: 'Align', options: ['end', 'start'], default: 'end' },
});

export default function PopMenuDemo({ align }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [status, setStatus] = useState('Shared with 3 people');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
      ]}
    >
      <Image source={photo('mistLake')} style={styles.cover} accessibilityIgnoresInvertColors />
      <View style={[styles.row, { padding: space[4], gap: space[3] }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
          >
            Mist Lake
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{status}</Text>
        </View>
        <PopMenu
          accessibilityLabel="More actions"
          align={align}
          items={[
            {
              key: 'share',
              label: 'Share',
              icon: (c) => <DemoIcon name="share" color={c} size={18} />,
              onPress: () => setStatus('Link copied'),
            },
            {
              key: 'save',
              label: 'Save to device',
              icon: (c) => <DemoIcon name="savePhoto" color={c} size={18} />,
              onPress: () => setStatus('Saved to Photos'),
            },
            {
              key: 'print',
              label: 'Print',
              icon: (c) => <DemoIcon name="print" color={c} size={18} />,
              disabled: true,
              onPress: () => {},
            },
            {
              key: 'delete',
              label: 'Delete',
              destructive: true,
              icon: (c) => <DemoIcon name="trash" color={c} size={18} />,
              onPress: () => setStatus('Moved to Recently deleted'),
            },
          ]}
        >
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: colors.text }]} />
            ))}
          </View>
        </PopMenu>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cover: { width: '100%', height: 180 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
