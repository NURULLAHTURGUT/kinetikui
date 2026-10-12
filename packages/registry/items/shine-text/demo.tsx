import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ShineText } from './shine-text';

export const controls = defineControls({
  duration: { type: 'number', label: 'Sweep (ms)', min: 600, max: 4000, step: 100, default: 1800 },
  pause: { type: 'number', label: 'Pause (ms)', min: 0, max: 4000, step: 100, default: 1400 },
  fontSize: { type: 'number', label: 'Size', min: 18, max: 56, step: 2, default: 40 },
});

export default function ShineTextDemo({
  duration,
  pause,
  fontSize,
}: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  return (
    <View style={{ gap: space[6], alignItems: 'center', paddingVertical: space[8] }}>
      <ShineText text="Unlock Pro" fontSize={fontSize} duration={duration} pause={pause} />
      <ShineText
        text="Limited edition · 48 h left"
        fontSize={16}
        fontWeight="600"
        color={colors.textMuted}
        shineColor={colors.ember}
        duration={duration}
        pause={pause}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        Gradient masked by the glyphs, swept on the UI thread
      </Text>
    </View>
  );
}
