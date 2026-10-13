import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SplitButton } from './split-button';

export const controls = defineControls({
  tone: { type: 'select', label: 'Tone', options: ['ember', 'azure'], default: 'azure' },
});

const OPTIONS = [
  { value: 'publish', label: 'Publish', description: 'Live for everyone now' },
  { value: 'schedule', label: 'Schedule for 9:00', description: 'Tomorrow morning, your time' },
  { value: 'draft', label: 'Save draft', description: 'Only you can see it' },
];

const DONE: Record<string, string> = {
  publish: 'Published. It is live.',
  schedule: 'Scheduled for 9:00 tomorrow.',
  draft: 'Draft saved.',
};

export default function SplitButtonDemo({ tone }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [value, setValue] = useState('publish');
  const [note, setNote] = useState('Pick another way to publish from the arrow.');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: font.size.xs,
            fontWeight: font.weight.semibold,
          }}
        >
          FIELD NOTES · ISSUE 12
        </Text>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          The quiet season
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          1,240 words · 6 photos · edited 2 minutes ago
        </Text>
      </View>
      <SplitButton
        tone={tone}
        options={OPTIONS}
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setNote('The button now does that. Press it to run it.');
        }}
        onPress={(v) => setNote(DONE[v]!)}
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
