import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SlotText } from './slot-text';

export const controls = defineControls({
  spins: { type: 'number', label: 'Spins per reel', min: 2, max: 14, step: 1, default: 6 },
  stagger: { type: 'number', label: 'Stagger (ms)', min: 0, max: 120, step: 15, default: 45 },
});

const PRIZES = ['$1,250', '$980', '$12,400', '$75', '$3,060'];
const WORDS = ['QUIET', 'BOLD', 'SPRING', 'MOTION', 'CALM'];

export default function SlotTextDemo({ spins, stagger }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [turn, setTurn] = useState(0);

  return (
    <View style={{ gap: space[6], alignItems: 'center' }}>
      <View style={{ alignItems: 'center', gap: space[2] }}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>This week you saved</Text>
        <SlotText
          text={PRIZES[turn % PRIZES.length]!}
          spins={spins}
          stagger={stagger}
          style={{ alignSelf: 'center' }}
        />
      </View>
      <SlotText
        text={WORDS[turn % WORDS.length]!}
        spins={spins}
        stagger={stagger}
        style={{ alignSelf: 'center' }}
        textStyle={{ fontSize: font.size.xl, color: colors.azure, letterSpacing: 2 }}
      />
      <Pressable
        onPress={() => setTurn((t) => t + 1)}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: 48,
          paddingHorizontal: space[6],
          justifyContent: 'center',
          borderRadius: radius.pill,
          backgroundColor: colors.ember,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text
          style={{
            color: colors.onEmber,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          Spin
        </Text>
      </Pressable>
    </View>
  );
}
