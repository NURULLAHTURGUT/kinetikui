import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { BeamButton } from './beam-button';

export const controls = defineControls({
  lap: { type: 'number', label: 'Seconds per lap', min: 1.5, max: 6, step: 0.5, default: 3 },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function BeamButtonDemo({ lap, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  return (
    <View style={{ alignItems: 'center', gap: space[6], paddingVertical: space[6] }}>
      <View style={{ alignItems: 'center', gap: space[2] }}>
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
          Kinetik Pro
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Every component, every screen, every update.
        </Text>
      </View>
      <BeamButton
        lap={lap}
        disabled={disabled}
        leading={<DemoIcon name="sparkles" color={colors.text} size={18} strokeWidth={2} />}
        style={{ alignSelf: 'center' }}
      >
        Upgrade to Pro
      </BeamButton>
      <BeamButton
        variant="ember"
        lap={lap * 1.3}
        disabled={disabled}
        accessibilityLabel="Start free trial"
        style={{ alignSelf: 'center' }}
      >
        <Text
          style={{
            color: colors.onEmber,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          Start free trial
        </Text>
        <DemoIcon name="arrowRight" color={colors.onEmber} size={18} strokeWidth={2} />
      </BeamButton>
    </View>
  );
}
