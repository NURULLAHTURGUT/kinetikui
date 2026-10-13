import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { AvatarStack } from './avatar-stack';

export const controls = defineControls({
  size: { type: 'number', label: 'Size', min: 32, max: 48, step: 4, default: 40 },
  max: { type: 'number', label: 'Stacked faces', min: 2, max: 5, step: 1, default: 4 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const TEAM = [
  { id: 'a', name: 'Maya Lindqvist' },
  { id: 'b', name: 'Leo Okafor' },
  { id: 'c', name: 'Ines Duarte' },
  { id: 'd', name: 'Kenji Mori' },
  { id: 'e', name: 'Sara Haddad' },
  { id: 'f', name: 'Tom Becker' },
  { id: 'g', name: 'Zeynep Arslan' },
  { id: 'h', name: 'Noor Rahman' },
];

export default function AvatarStackDemo({ size, max, haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space[4],
        gap: space[3],
      }}
    >
      <View style={{ gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          Autumn campaign
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          8 people · tap the faces to see who
        </Text>
      </View>
      <AvatarStack
        people={TEAM}
        size={size}
        max={max}
        haptics={haptics}
        ringColor={colors.surface}
      />
    </View>
  );
}
