import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RotationRuler } from './rotation-ruler';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function RotationRulerDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [angle, setAngle] = useState(6);
  return (
    <View style={{ gap: space[4], width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      {/* A stand-in photo that turns with the ruler. */}
      <View
        style={{
          height: 150,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            width: 170,
            height: 110,
            borderRadius: radius.md,
            backgroundColor: colors.azure,
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Rotation
        </Text>
        <Text
          style={{ color: colors.textMuted, fontSize: font.size.sm, fontVariant: ['tabular-nums'] }}
        >
          {angle}°
        </Text>
      </View>
      <RotationRuler value={angle} onValueChange={setAngle} haptics={haptics} disabled={disabled} />
    </View>
  );
}
