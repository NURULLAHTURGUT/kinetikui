import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DemoIcon, type DemoIconName } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ExpandToolbar } from './expand-toolbar';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const TOOLS: { key: string; label: string; icon: DemoIconName; hint: string }[] = [
  { key: 'pen', label: 'Sketch', icon: 'pencil', hint: 'Draw with a finger. Two fingers to pan.' },
  { key: 'text', label: 'Text', icon: 'textSize', hint: 'Tap anywhere to type.' },
  { key: 'photo', label: 'Photo', icon: 'photo', hint: 'Drop in a photo from your library.' },
  { key: 'voice', label: 'Voice', icon: 'microphone', hint: 'Hold to record a voice note.' },
  { key: 'place', label: 'Place', icon: 'mapPin', hint: 'Pin where you are.' },
];

export default function ExpandToolbarDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [tool, setTool] = useState('pen');
  const current = TOOLS.find((t) => t.key === tool)!;

  return (
    <View style={{ gap: space[4], alignItems: 'center' }}>
      <View
        style={[
          styles.page,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
            padding: space[5],
            gap: space[3],
          },
        ]}
      >
        <View
          style={[styles.badge, { backgroundColor: colors.azureSoft, borderRadius: radius.md }]}
        >
          <DemoIcon name={current.icon} color={colors.azure} size={22} />
        </View>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          {current.label}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
          {current.hint}
        </Text>
      </View>
      <ExpandToolbar
        accessibilityLabel="Note tools"
        items={TOOLS.map((t) => ({
          key: t.key,
          label: t.label,
          icon: (c: string) => <DemoIcon name={t.icon} color={c} size={20} />,
        }))}
        value={tool}
        onValueChange={setTool}
        haptics={haptics}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'stretch',
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
