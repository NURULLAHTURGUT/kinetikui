import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { HoldToConfirm } from './hold-to-confirm';

export const controls = defineControls({
  duration: {
    type: 'number',
    label: 'Hold time (ms)',
    min: 600,
    max: 3000,
    step: 100,
    default: 1200,
  },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function HoldToConfirmDemo({ duration, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [log, setLog] = useState<string | null>(null);

  return (
    <View style={{ gap: space[5], alignItems: 'center', paddingVertical: space[4] }}>
      <HoldToConfirm
        label="Hold to delete project"
        confirmedLabel="Project deleted"
        tone="danger"
        duration={duration}
        haptics={haptics}
        onConfirm={() => setLog('Deleted “Aurora app”')}
        style={{ alignSelf: 'center' }}
      />
      <HoldToConfirm
        label="Hold to send ₺250"
        confirmedLabel="Sent"
        duration={duration}
        haptics={haptics}
        onConfirm={() => setLog('Sent ₺250 to Deniz')}
        style={{ alignSelf: 'center' }}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}
      >
        {log ?? 'Let go early to cancel'}
      </Text>
    </View>
  );
}
