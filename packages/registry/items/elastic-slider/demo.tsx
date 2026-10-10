import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ElasticSlider } from './elastic-slider';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function ElasticSliderDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, space } = useKinetikTheme();
  const [volume, setVolume] = useState(64);
  const [exposure, setExposure] = useState(0.5);

  return (
    <View style={{ gap: space[8], paddingVertical: space[4] }}>
      <ElasticSlider
        label="Volume"
        value={volume}
        onValueChange={setVolume}
        min={0}
        max={100}
        step={1}
        formatValue={(v) => `${Math.round(v)}%`}
        haptics={haptics}
        disabled={disabled}
      />
      <ElasticSlider
        label="Exposure"
        value={exposure}
        onValueChange={setExposure}
        min={-2}
        max={2}
        step={0.5}
        color={colors.ice}
        formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} EV`}
        haptics={haptics}
        disabled={disabled}
      />
    </View>
  );
}
