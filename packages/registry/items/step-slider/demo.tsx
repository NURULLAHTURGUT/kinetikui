import { useState } from 'react';
import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { StepSlider } from './step-slider';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

const LEVELS = ['Subtle', 'Balanced', 'Bold', 'Wild'];

export default function StepSliderDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [level, setLevel] = useState(0);
  const [runs, setRuns] = useState(0);
  return (
    <View style={{ gap: space[3], width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Generate image
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {LEVELS[level]}
          {runs > 0 ? ` · run ${runs}` : ''}
        </Text>
      </View>
      <StepSlider
        label="Creativity"
        steps={LEVELS.length}
        labels={LEVELS}
        value={level}
        onValueChange={setLevel}
        action={{
          icon: <DemoIcon name="refresh" color={colors.text} size={22} />,
          label: 'Generate again',
          onPress: () => setRuns((r) => r + 1),
        }}
        haptics={haptics}
        disabled={disabled}
      />
    </View>
  );
}
