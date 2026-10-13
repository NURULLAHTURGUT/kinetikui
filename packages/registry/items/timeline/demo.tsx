import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { Timeline } from './timeline';

export const controls = defineControls({
  thumbnail: { type: 'boolean', label: 'Thumbnail', default: true },
});

export default function TimelineDemo({ thumbnail }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [plays, setPlays] = useState(0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <View style={styles.top}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Order #4821
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPlays((p) => p + 1)}
          style={styles.replay}
        >
          <Text
            style={{
              color: colors.azure,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            Replay
          </Text>
        </Pressable>
      </View>
      <Timeline
        playKey={plays}
        events={[
          {
            key: 'placed',
            title: 'Order placed',
            time: 'Mon 09:12',
            description: 'Paid with card ending 4242.',
          },
          {
            key: 'packed',
            title: 'Packed in Lisbon',
            time: 'Mon 16:40',
            description: 'Two prints and an oak frame.',
            children: thumbnail ? (
              <Image
                source={photo('mistLake')}
                style={[styles.thumb, { borderRadius: radius.sm }]}
                accessibilityIgnoresInvertColors
              />
            ) : undefined,
          },
          {
            key: 'transit',
            title: 'On its way',
            time: 'Today',
            description: 'With the courier, arriving Thursday.',
            state: 'current',
          },
          { key: 'delivered', title: 'Delivered', time: 'Thu', state: 'upcoming' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  replay: {
    minHeight: minTouchTarget,
    minWidth: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  thumb: { width: 120, height: 72 },
});
