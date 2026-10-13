import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { LetterMorph } from './letter-morph';

export const controls = defineControls({
  auto: { type: 'boolean', label: 'Cycle words', default: true },
});

const WORDS = ['Explore', 'Express', 'Expand', 'Expert', 'Export'];

export default function LetterMorphDemo({ auto }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [word, setWord] = useState(0);
  const [following, setFollowing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 1800);
    return () => clearInterval(id);
  }, [auto]);

  const pill = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? colors.surfaceRaised : colors.azure,
          borderColor: active ? colors.borderStrong : colors.azure,
          borderRadius: radius.pill,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <LetterMorph
        text={label}
        textStyle={{
          color: active ? colors.text : colors.onAzure,
          fontSize: font.size.md,
          fontWeight: font.weight.semibold,
          letterSpacing: 0,
        }}
      />
    </Pressable>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[5],
        },
      ]}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>Kinetik helps you</Text>
        <LetterMorph
          text={WORDS[word]!}
          textStyle={{ fontSize: font.size['4xl'], fontWeight: font.weight.bold }}
        />
      </View>
      <View style={styles.row}>
        {pill(following ? 'Following' : 'Follow', following, () => setFollowing((f) => !f))}
        {pill(saved ? 'Saved' : 'Save', saved, () => setSaved((s) => !s))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 10 },
  pill: {
    height: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
