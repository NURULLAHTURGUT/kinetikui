import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ProgressBar } from './progress-bar';

export const controls = defineControls({
  size: { type: 'select', label: 'Size', options: ['md', 'sm'], default: 'md' },
});

export default function ProgressBarDemo({ size }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [progress, setProgress] = useState(0.18);
  const active = progress < 1;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.04 + Math.random() * 0.1));
    }, 900);
    return () => clearInterval(id);
  }, [active]);

  return (
    <View style={{ gap: space[6] }}>
      <ProgressBar label="Uploading 12 photos" value={progress} size={size} />
      <ProgressBar label="Preparing the export" value={null} size={size} />
      <Pressable
        onPress={() => {
          setProgress(0.05);
        }}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignSelf: 'center',
          minHeight: 44,
          paddingHorizontal: space[5],
          justifyContent: 'center',
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.surfaceSunken : undefined,
        })}
      >
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          Start again
        </Text>
      </Pressable>
    </View>
  );
}
