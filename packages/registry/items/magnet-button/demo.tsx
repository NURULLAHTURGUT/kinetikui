import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { MagnetButton } from './magnet-button';

export const controls = defineControls({
  strength: { type: 'number', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.5 },
  field: { type: 'number', label: 'Field (pt)', min: 0, max: 80, step: 4, default: 40 },
  maxPull: { type: 'number', label: 'Max pull (pt)', min: 4, max: 28, step: 1, default: 14 },
});

export default function MagnetButtonDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [last, setLast] = useState<string | null>(null);

  return (
    <View style={{ alignItems: 'center', gap: space[10], paddingVertical: space[8] }}>
      <MagnetButton
        {...props}
        style={{ alignSelf: 'center' }}
        onPress={() => setLast('Get started')}
      >
        Get started
      </MagnetButton>
      <MagnetButton
        {...props}
        style={{ alignSelf: 'center' }}
        variant="surface"
        onPress={() => setLast('See pricing')}
      >
        See pricing
      </MagnetButton>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}
      >
        {last ? `Pressed “${last}”` : 'Touch near a button and drag around it'}
      </Text>
    </View>
  );
}
