import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { GlideRadio } from './glide-radio';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const OPTIONS = [
  { value: 'all', label: 'Everything', description: 'Every new post, reply and mention.' },
  { value: 'mentions', label: 'Mentions and replies' },
  { value: 'digest', label: 'A weekly digest', description: 'One email on Monday morning.' },
  { value: 'none', label: 'Nothing' },
];

export default function GlideRadioDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [value, setValue] = useState('mentions');
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space[4],
        gap: space[2],
      }}
    >
      <Text
        style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
      >
        Notify me about
      </Text>
      <GlideRadio
        accessibilityLabel="Notify me about"
        options={OPTIONS}
        value={value}
        onValueChange={setValue}
        haptics={haptics}
      />
    </View>
  );
}
