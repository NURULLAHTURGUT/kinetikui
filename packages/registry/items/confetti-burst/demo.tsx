import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ConfettiBurst, type ConfettiHandle } from './confetti-burst';

export const controls = defineControls({
  count: { type: 'number', label: 'Particles', min: 20, max: 300, step: 10, default: 90 },
  power: { type: 'number', label: 'Power', min: 0.5, max: 1.6, step: 0.1, default: 1 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function ConfettiBurstDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const confetti = useRef<ConfettiHandle>(null);
  const [done, setDone] = useState(0);

  return (
    <ConfettiBurst ref={confetti} {...props} style={styles.stage}>
      <View style={[styles.center, { gap: space[4] }]}>
        <Text
          style={{ color: colors.text, fontSize: font.size['2xl'], fontWeight: font.weight.heavy }}
        >
          {done === 0 ? 'Ready to ship?' : 'Shipped!'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {done === 0
            ? 'Tap the button to celebrate.'
            : `${done} release${done === 1 ? '' : 's'} today`}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDone((d) => d + 1);
            confetti.current?.burst();
          }}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.ember,
              borderRadius: radius.pill,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={{ color: colors.onEmber, fontWeight: font.weight.bold, fontSize: font.size.md }}
          >
            Ship release
          </Text>
        </Pressable>
      </View>
    </ConfettiBurst>
  );
}

const styles = StyleSheet.create({
  stage: { height: 380 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  button: { height: 52, paddingHorizontal: 28, justifyContent: 'center', marginTop: 8 },
});
