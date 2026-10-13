import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { KinetikProvider, useKinetikConfig, useKinetikTheme } from '../../shared/tokens/theme';
import { ThemeSwitch, type ThemeMode } from './theme-switch';

export const controls = defineControls({
  showLabel: { type: 'boolean', label: 'Show label', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

function Preview({
  mode,
  setMode,
  showLabel,
  haptics,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  showLabel: boolean;
  haptics: boolean;
}) {
  const { colors, font, radius, space } = useKinetikTheme();
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.xl,
        padding: space[5],
        gap: space[4],
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Appearance
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          This card follows the switch, so you can see both themes.
        </Text>
      </View>
      <ThemeSwitch
        value={mode}
        onValueChange={setMode}
        label={showLabel ? 'Dark mode' : undefined}
        haptics={haptics}
      />
    </View>
  );
}

export default function ThemeSwitchDemo({ showLabel, haptics }: ControlValues<typeof controls>) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  // Keeps the outer motion and haptics settings; only the scheme follows the switch.
  const outer = useKinetikConfig();
  return (
    <KinetikProvider scheme={mode} reduceMotion={outer.reduceMotion} haptics={outer.haptics}>
      <Preview mode={mode} setMode={setMode} showLabel={showLabel} haptics={haptics} />
    </KinetikProvider>
  );
}
