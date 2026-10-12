import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FanStack } from './fan-stack';

export const controls = defineControls({
  spread: { type: 'number', label: 'Spread (°)', min: 4, max: 18, step: 1, default: 11 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const ALBUM: PhotoKey[] = ['pastelTide', 'whiteSands', 'huacachina', 'lonePalm', 'stillWater'];
const ITEMS = ALBUM.map((key) => ({ key, image: photo(key), title: photos[key].title }));

export default function FanStackDemo({ spread, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState<number | null>(null);
  const focus = lifted === null ? null : photos[ALBUM[lifted]!];

  return (
    <View style={{ gap: space[2], alignItems: 'center' }}>
      <FanStack
        items={ITEMS}
        spread={spread}
        haptics={haptics}
        accessibilityLabel="Coast and desert"
        open={open}
        onOpenChange={setOpen}
        onSelect={setLifted}
      />
      <View style={styles.caption}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          {focus ? focus.title : 'Coast and desert'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {focus
            ? focus.place
            : open
              ? 'Tap a photo to lift it'
              : `${ALBUM.length} photos · Tap the pile`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { alignItems: 'center', gap: 2 },
});
