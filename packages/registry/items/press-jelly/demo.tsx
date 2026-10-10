import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PressJelly } from './press-jelly';

export const controls = defineControls({
  squish: { type: 'number', label: 'Squish', min: 0, max: 1, step: 0.05, default: 0.6 },
  size: { type: 'select', label: 'Size', options: ['md', 'lg'], default: 'lg' },
  loading: { type: 'boolean', label: 'Loading', default: false },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function PressJellyDemo({
  squish,
  size,
  loading,
  disabled,
}: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [count, setCount] = useState(0);
  const common = { squish, size, loading, disabled, onPress: () => setCount((c) => c + 1) };

  return (
    <View style={{ gap: space[4], alignItems: 'center' }}>
      <PressJelly {...common} block>
        Continue
      </PressJelly>
      <View style={{ flexDirection: 'row', gap: space[3], alignSelf: 'stretch' }}>
        <PressJelly {...common} variant="ice" style={{ flex: 1 }}>
          Join
        </PressJelly>
        <PressJelly {...common} variant="surface" style={{ flex: 1 }}>
          Later
        </PressJelly>
      </View>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.textMuted, fontSize: font.size.sm, fontVariant: ['tabular-nums'] }}
      >
        {count === 0
          ? 'Press and hold to feel the squash'
          : `Pressed ${count} ${count === 1 ? 'time' : 'times'}`}
      </Text>
    </View>
  );
}
