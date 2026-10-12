import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RippleField } from './ripple-field';

export const controls = defineControls({
  spacing: { type: 'number', label: 'Dot spacing (pt)', min: 10, max: 32, step: 1, default: 18 },
  strength: { type: 'number', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.8 },
  haptics: { type: 'boolean', label: 'Haptic on touch', default: false },
});

export default function RippleFieldDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <RippleField {...props} style={[styles.field, { borderRadius: radius.xl }]}>
      <View pointerEvents="none" style={[styles.label, { padding: space[6] }]}>
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
          Touch anywhere
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 4 }}>
          Use several fingers at once.
        </Text>
      </View>
    </RippleField>
  );
}

const styles = StyleSheet.create({
  field: { height: 340 },
  label: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
});
