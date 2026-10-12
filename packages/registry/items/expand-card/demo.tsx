import { useState } from 'react';
import { Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ExpandCard } from './expand-card';

export const controls = defineControls({
  imageAspect: {
    type: 'number',
    label: 'Picture height',
    min: 0.45,
    max: 0.9,
    step: 0.05,
    default: 0.6,
  },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const STAYS: { key: PhotoKey; text: string; meta: string }[] = [
  {
    key: 'mistLake',
    text: 'A cabin on the shore, a canoe at the jetty and mornings that start in the fog.',
    meta: '2 GUESTS · 3 NIGHTS · FROM $180',
  },
  {
    key: 'whiteSands',
    text: 'Pale dunes as far as you can see. Camp under the moon and walk out at first light.',
    meta: '2 GUESTS · 1 NIGHT · FROM $95',
  },
  {
    key: 'snowRidge',
    text: 'A warm room below the ridge, with trails that start at the door.',
    meta: '4 GUESTS · 4 NIGHTS · FROM $240',
  },
];

export default function ExpandCardDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [open, setOpen] = useState<PhotoKey | null>('mistLake');

  return (
    <View style={{ gap: space[3] }}>
      {STAYS.map(({ key, text, meta }) => {
        const p = photos[key];
        return (
          <ExpandCard
            key={key}
            {...props}
            image={photo(key)}
            title={p.title}
            subtitle={p.place}
            expanded={open === key}
            onExpandedChange={(next) => setOpen(next ? key : null)}
          >
            <View style={{ gap: space[3] }}>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}>
                {text}
              </Text>
              <Text
                style={{ color: colors.textSubtle, fontSize: font.size.xs, letterSpacing: 0.6 }}
              >
                {meta}
              </Text>
            </View>
          </ExpandCard>
        );
      })}
    </View>
  );
}
