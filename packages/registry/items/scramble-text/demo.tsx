import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { SCRAMBLE_GLYPHS, ScrambleText } from './scramble-text';

export const controls = defineControls({
  duration: {
    type: 'number',
    label: 'Duration (ms)',
    min: 300,
    max: 2000,
    step: 100,
    default: 900,
  },
  glyphs: {
    type: 'select',
    label: 'Glyphs',
    options: ['mixed', 'binary', 'blocks'],
    default: 'mixed',
  },
  autoplay: { type: 'boolean', label: 'Cycle words', default: true },
});

const WORDS = ['KINETIK', 'MOTION', 'UI THREAD', 'SHIP IT'];
const GLYPHS = { mixed: SCRAMBLE_GLYPHS, binary: '01', blocks: '░▒▓█▄▀■□' } as const;

export default function ScrambleTextDemo({
  duration,
  glyphs,
  autoplay,
}: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), duration + 1600);
    return () => clearInterval(t);
  }, [autoplay, duration]);

  return (
    <View style={{ gap: space[6], alignItems: 'center', paddingVertical: space[6] }}>
      <ScrambleText
        text={WORDS[index] ?? ''}
        duration={duration}
        glyphs={GLYPHS[glyphs]}
        style={{ fontSize: font.size['4xl'], fontWeight: font.weight.heavy, letterSpacing: 2 }}
      />
      <ScrambleText
        text={`BUILD ${String(1024 + index * 7).padStart(5, '0')} · READY`}
        duration={duration * 0.8}
        delay={150}
        glyphs={GLYPHS[glyphs]}
        style={{
          fontSize: font.size.sm,
          color: colors.textMuted,
          fontWeight: font.weight.medium,
          letterSpacing: 1.5,
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setIndex((i) => (i + 1) % WORDS.length)}
        style={{
          minHeight: minTouchTarget,
          justifyContent: 'center',
          paddingHorizontal: space[4],
        }}
      >
        <Text
          style={{ color: colors.ember, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          Next word
        </Text>
      </Pressable>
    </View>
  );
}
