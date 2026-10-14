import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { IntensitySlider } from './intensity-slider';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function IntensitySliderDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space, shadow } = useKinetikTheme();
  const [value, setValue] = useState(42);
  const [open, setOpen] = useState(true);
  const chip = {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    boxShadow: shadow.sm,
    borderColor: colors.border,
  };
  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: space[3] }}>
      {/* A toolbar like an editor's; the value chip opens the slider. */}
      <View style={[styles.row, { gap: space[2], alignSelf: 'center' }]}>
        <View style={[styles.chip, chip]}>
          <DemoIcon name="addCircle" color={colors.textMuted} size={18} />
          <Text style={{ color: colors.text, fontSize: font.size.md }}>Add</Text>
        </View>
        <View style={[styles.chip, chip]}>
          <Text style={{ color: colors.text, fontSize: font.size.md }}>Type</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Intensity ${value}`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            style={[
              styles.value,
              { backgroundColor: colors.surfaceSunken, borderRadius: radius.sm },
            ]}
          >
            <Text
              style={{ color: colors.text, fontSize: font.size.md, fontVariant: ['tabular-nums'] }}
            >
              {value}
            </Text>
          </Pressable>
        </View>
      </View>
      {open ? (
        <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(140)}>
          <IntensitySlider value={value} onValueChange={setValue} haptics={haptics} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
