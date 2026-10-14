import { useState } from 'react';
import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PaletteStrip } from './palette-strip';

export const controls = defineControls({});

// Hues spaced around the wheel with a light and a dark partner, like a generated palette.
function makePalette(seed: number) {
  const hue = (seed * 67) % 360;
  return [
    `hsl(${hue}, 25%, 95%)`,
    `hsl(${(hue + 200) % 360}, 8%, 38%)`,
    `hsl(${(hue + 150) % 360}, 62%, 52%)`,
  ];
}

export default function PaletteStripDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [seed, setSeed] = useState(3);
  const [picked, setPicked] = useState<string | null>(null);
  const palette = makePalette(seed);
  return (
    <View style={{ gap: space[3], width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Color palette
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: font.size.xs }}>
          {picked ?? 'Tap a swatch'}
        </Text>
      </View>
      <PaletteStrip
        colors={palette}
        onSwatchPress={(_, color) => setPicked(color)}
        action={{
          icon: <DemoIcon name="refresh" color={colors.text} size={22} />,
          label: 'Shuffle palette',
          onPress: () => {
            setPicked(null);
            setSeed((s) => s + 1);
          },
        }}
      />
    </View>
  );
}
