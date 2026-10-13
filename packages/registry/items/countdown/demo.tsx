import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Countdown } from './countdown';

export const controls = defineControls({
  length: {
    type: 'select',
    label: 'Starts in',
    options: ['10 seconds', '3 hours', '4 days'],
    default: '10 seconds',
  },
});

const MS: Record<string, number> = {
  '10 seconds': 10_000,
  '3 hours': 3 * 3600_000 + 12 * 60_000,
  '4 days': 4 * 86_400_000 + 7 * 3600_000,
};

export default function CountdownDemo({ length }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  // Restart moves the start to now; the length control counts from the same start.
  const [start, setStart] = useState(() => Date.now());

  return (
    <View style={{ gap: space[5], alignItems: 'center' }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>The keynote starts in</Text>
      <Countdown
        key={`${start}-${length}`}
        to={start + MS[length]!}
        accessibilityLabel="The keynote starts in"
      />
      <Pressable
        onPress={() => setStart(Date.now())}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: 44,
          paddingHorizontal: space[5],
          justifyContent: 'center',
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.surfaceSunken : undefined,
        })}
      >
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          Restart
        </Text>
      </Pressable>
    </View>
  );
}
