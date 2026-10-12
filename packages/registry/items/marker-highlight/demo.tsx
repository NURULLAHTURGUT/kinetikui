import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { MarkerHighlight } from './marker-highlight';

export const controls = defineControls({
  variant: {
    type: 'select',
    label: 'Variant',
    options: ['marker', 'underline'],
    default: 'marker',
  },
  speed: { type: 'number', label: 'Speed (ms / letter)', min: 10, max: 60, step: 2, default: 28 },
});

export default function MarkerHighlightDemo({ variant, speed }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[6],
          gap: space[4],
        },
      ]}
    >
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        Field notes
      </Text>
      <MarkerHighlight
        key={`${variant}-${speed}`}
        variant={variant}
        speed={speed}
        text="The best trips are planned together. Keep every booking, map and ticket in one quiet place, and leave the rest to the road."
        highlights={[
          'planned together',
          'every booking, map and ticket',
          'leave the rest to the road',
        ]}
        style={{ fontSize: font.size.xl, lineHeight: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
