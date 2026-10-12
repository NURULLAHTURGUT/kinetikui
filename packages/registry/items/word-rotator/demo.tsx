import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { WordRotator } from './word-rotator';

export const controls = defineControls({
  interval: {
    type: 'number',
    label: 'Interval (ms)',
    min: 1200,
    max: 4000,
    step: 200,
    default: 2200,
  },
  stagger: { type: 'number', label: 'Letter delay', min: 0, max: 60, step: 4, default: 24 },
  align: { type: 'select', label: 'Align', options: ['center', 'left'], default: 'center' },
});

export default function WordRotatorDemo({
  interval,
  stagger,
  align,
}: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  return (
    <View style={[styles.stage, { gap: space[3] }, align === 'center' && styles.centered]}>
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        Motion for React Native
      </Text>
      <WordRotator
        before="Interfaces that feel"
        words={['alive.', 'effortless.', 'physical.', 'yours.']}
        interval={interval}
        stagger={stagger}
        align={align}
        style={{ fontSize: font.size['3xl'], lineHeight: 44 }}
      />
      <Text
        style={{
          color: colors.textMuted,
          fontSize: font.size.md,
          lineHeight: 24,
          textAlign: align,
          maxWidth: 320,
        }}
      >
        Springs, gestures and shaders that run on the UI thread, copied into your project.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', maxWidth: 380 },
  centered: { alignItems: 'center', alignSelf: 'center' },
});
