import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { WordCascade } from './word-cascade';

export const controls = defineControls({
  stagger: { type: 'number', label: 'Stagger (ms)', min: 10, max: 150, step: 5, default: 45 },
  rise: { type: 'number', label: 'Rise (pt)', min: 0, max: 24, step: 1, default: 10 },
});

export default function WordCascadeDemo({ stagger, rise }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [replay, setReplay] = useState(0);

  return (
    <View style={{ gap: space[5], paddingVertical: space[2] }}>
      <WordCascade
        replayKey={replay}
        stagger={stagger}
        rise={rise}
        text="Motion should explain, not decorate."
        style={{
          fontSize: font.size['2xl'],
          fontWeight: font.weight.bold,
          lineHeight: 34,
          letterSpacing: -0.4,
        }}
      />
      <WordCascade
        replayKey={replay}
        stagger={stagger * 0.6}
        rise={rise * 0.6}
        delay={260}
        text="Every word here rises on its own clock, yet one shared value drives them all on the UI thread. React renders once."
        style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 24 }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setReplay((r) => r + 1)}
        style={{ alignSelf: 'flex-start', minHeight: minTouchTarget, justifyContent: 'center' }}
      >
        <Text
          style={{ color: colors.ember, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          Replay
        </Text>
      </Pressable>
    </View>
  );
}
