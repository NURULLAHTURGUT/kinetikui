import { useState } from 'react';
import { Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ParallaxCarousel } from './parallax-carousel';

export const controls = defineControls({
  parallax: { type: 'number', label: 'Parallax', min: 0, max: 1, step: 0.1, default: 0.6 },
  cardWidth: { type: 'number', label: 'Card width', min: 0.6, max: 0.9, step: 0.02, default: 0.74 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const KEYS: PhotoKey[] = [
  'whiteSands',
  'mistLake',
  'huacachina',
  'nightPeak',
  'cloudForest',
  'pastelTide',
];
const ITEMS = KEYS.map((key) => ({
  key,
  image: photo(key),
  title: photos[key].title,
  subtitle: photos[key].place,
}));

export default function ParallaxCarouselDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [index, setIndex] = useState(0);

  return (
    <View style={{ gap: space[4] }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
          Places
        </Text>
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: font.size.sm,
            fontVariant: ['tabular-nums'],
          }}
        >
          {String(index + 1).padStart(2, '0')} / {String(ITEMS.length).padStart(2, '0')}
        </Text>
      </View>
      <ParallaxCarousel {...props} items={ITEMS} aspect={1.2} onIndexChange={setIndex} />
    </View>
  );
}
