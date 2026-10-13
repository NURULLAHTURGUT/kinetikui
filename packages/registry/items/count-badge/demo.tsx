import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { CountBadge } from './count-badge';

export const controls = defineControls({
  tone: { type: 'select', label: 'Tone', options: ['danger', 'azure'], default: 'danger' },
  max: { type: 'number', label: 'Cap', min: 9, max: 999, step: 90, default: 99 },
});

function Bell() {
  const { colors } = useKinetikTheme();
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center' }}>
      <View
        style={{
          width: 16,
          height: 15,
          marginTop: 2,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: colors.text,
        }}
      />
      <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: colors.text }} />
      <View
        style={{ width: 6, height: 3, marginTop: 1, borderRadius: 2, backgroundColor: colors.text }}
      />
    </View>
  );
}

export default function CountBadgeDemo({ tone, max }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [count, setCount] = useState(3);

  const button = (label: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: 64,
        paddingHorizontal: space[4],
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: pressed ? colors.surfaceSunken : undefined,
      })}
    >
      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: space[6], alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: space[8], alignItems: 'center' }}>
        <CountBadge count={count} max={max} tone={tone} formatLabel={(n) => `${n} notifications`}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell />
          </View>
        </CountBadge>
        <CountBadge count={count > 0 ? 1 : 0} dot tone={tone} formatLabel={() => 'Online'}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.surfaceRaised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: font.weight.semibold }}>MA</Text>
          </View>
        </CountBadge>
      </View>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {button('−1', () => setCount((c) => Math.max(0, c - 1)))}
        {button('+1', () => setCount((c) => c + 1))}
        {button('+25', () => setCount((c) => c + 25))}
        {button('Clear', () => setCount(0))}
      </View>
    </View>
  );
}
