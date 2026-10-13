import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { CopyChip } from './copy-chip';

export const controls = defineControls({
  monospace: { type: 'boolean', label: 'Monospace', default: true },
  resetAfter: { type: 'number', label: 'Reset (s)', min: 1, max: 4, step: 0.5, default: 1.6 },
});

export default function CopyChipDemo({ monospace, resetAfter }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  // The demo keeps what was copied here; in an app, pass expo-clipboard's setStringAsync.
  const [clipboard, setClipboard] = useState('');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[3],
        },
      ]}
    >
      <Text
        style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
      >
        Invite your team
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
        Share the link, or give them the code to enter in the app.
      </Text>
      <CopyChip
        label="Invite link"
        value="kinetik.app/join/north-studio"
        monospace={monospace}
        resetAfter={resetAfter * 1000}
        onCopy={setClipboard}
      />
      <CopyChip
        label="Team code"
        value="NORTH-4821"
        monospace={monospace}
        resetAfter={resetAfter * 1000}
        onCopy={setClipboard}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        {clipboard ? `On the clipboard: ${clipboard}` : 'Nothing copied yet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
