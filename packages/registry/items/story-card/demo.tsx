import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';
import { StoryCard } from './story-card';

export const controls = defineControls({
  duration: { type: 'number', label: 'Seconds each', min: 2, max: 8, step: 1, default: 4 },
  loop: { type: 'boolean', label: 'Loop', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const TRIP: { key: PhotoKey; caption: string }[] = [
  { key: 'huacachina', caption: 'Day 1 · An oasis between the dunes' },
  { key: 'whiteSands', caption: 'Day 3 · Gypsum, not snow' },
  { key: 'morningHaze', caption: 'Day 5 · Fog lifting off the valley' },
  { key: 'lonePalm', caption: 'Day 8 · The last swim' },
];

const STORIES = TRIP.map(({ key, caption }) => ({
  key,
  image: photo(key),
  title: photos[key].title,
  caption,
  accessibilityLabel: `${photos[key].title}, ${photos[key].place}`,
}));

export default function StoryCardDemo({ duration, loop, haptics }: ControlValues<typeof controls>) {
  const { colors, font } = useKinetikTheme();
  const [index, setIndex] = useState(0);

  return (
    <View style={styles.frame}>
      <StoryCard
        key={`${loop}`}
        stories={STORIES}
        duration={duration * 1000}
        loop={loop}
        haptics={haptics}
        onIndexChange={setIndex}
        header={
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: withAlpha(colors.highlight, 0.18) }]}>
              <DemoIcon name="compass" color={colors.highlight} size={18} />
            </View>
            <Text
              style={{
                color: colors.highlight,
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
              }}
            >
              Field notes
            </Text>
            <Text style={{ color: withAlpha(colors.highlight, 0.7), fontSize: font.size.sm }}>
              {`${index * 2 + 2}h`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 300, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
