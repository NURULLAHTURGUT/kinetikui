import { useState } from 'react';
import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { GradientSlider } from './gradient-slider';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function GradientSliderDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [hue, setHue] = useState(190);
  const [kelvin, setKelvin] = useState(3200);
  const title = (text: string) => (
    <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>
      {text}
    </Text>
  );
  return (
    <View style={{ gap: space[3], width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      {title('Color')}
      <GradientSlider
        label="Hue"
        stops="hue"
        min={0}
        max={360}
        step={1}
        value={hue}
        onValueChange={setHue}
        formatValue={(v) => `${v} degrees`}
        haptics={haptics}
        disabled={disabled}
      />
      <View style={{ height: space[3] }} />
      {title('White balance')}
      <GradientSlider
        label="Temperature"
        stops="temperature"
        min={2000}
        max={10000}
        step={100}
        value={kelvin}
        onValueChange={setKelvin}
        formatValue={(v) => `${v} kelvin`}
        action={{
          icon: <DemoIcon name="focus" color={colors.text} size={22} />,
          label: 'Reset white balance',
          onPress: () => setKelvin(5500),
        }}
        haptics={haptics}
        disabled={disabled}
      />
    </View>
  );
}
