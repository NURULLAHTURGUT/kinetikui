import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { InlineEdit } from './inline-edit';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function InlineEditDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [name, setName] = useState('Spring launch');
  const [owner, setOwner] = useState('Design team');

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space[4],
        gap: space[1],
      }}
    >
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>Project</Text>
      <InlineEdit
        accessibilityLabel="Project name"
        value={name}
        onSubmit={setName}
        haptics={haptics}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs, marginTop: space[2] }}>
        Owner
      </Text>
      <InlineEdit
        accessibilityLabel="Owner"
        value={owner}
        onSubmit={setOwner}
        haptics={haptics}
        textStyle={{ fontSize: font.size.md, fontWeight: font.weight.regular }}
      />
    </View>
  );
}
