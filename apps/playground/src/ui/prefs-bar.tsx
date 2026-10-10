import { useKinetikTheme } from '@kinetik/registry/shared/tokens/theme';
import { StyleSheet, Text, View } from 'react-native';

import { usePrefs, type SchemePref } from '../state/prefs';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

const schemeIcon: Record<SchemePref, IconName> = { system: 'system', dark: 'moon', light: 'sun' };
const nextScheme: Record<SchemePref, SchemePref> = {
  system: 'dark',
  dark: 'light',
  light: 'system',
};
const schemeLabel: Record<SchemePref, string> = { system: 'System', dark: 'Dark', light: 'Light' };

/** Compact pill buttons for theme, reduced motion and haptics previews. */
export function PrefsBar() {
  const { scheme, setScheme, reduceMotion, setReduceMotion, haptics, setHaptics } = usePrefs();
  return (
    <View style={styles.bar}>
      <Pill
        icon={schemeIcon[scheme]}
        label={schemeLabel[scheme]}
        a11y={`Theme: ${schemeLabel[scheme]}. Double tap to switch.`}
        onPress={() => setScheme(nextScheme[scheme])}
      />
      <Pill
        icon={reduceMotion ? 'pause' : 'wave'}
        label={reduceMotion ? 'Reduced' : 'Motion'}
        active={reduceMotion}
        a11y={`Reduce motion preview ${reduceMotion ? 'on' : 'off'}`}
        onPress={() => setReduceMotion(!reduceMotion)}
      />
      <Pill
        icon="vibrate"
        label={haptics ? 'Haptics' : 'Muted'}
        active={!haptics}
        a11y={`Haptics ${haptics ? 'on' : 'off'}`}
        onPress={() => setHaptics(!haptics)}
      />
    </View>
  );
}

function Pill({
  icon,
  label,
  onPress,
  active = false,
  a11y,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  a11y: string;
}) {
  const { colors, radius, font } = useKinetikTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderRadius: radius.pill,
          backgroundColor: active ? colors.emberSoft : colors.surface,
          borderColor: active ? colors.ember : colors.border,
        },
      ]}
    >
      <Icon name={icon} size={16} color={active ? colors.ember : colors.textMuted} />
      <Text
        style={{
          color: active ? colors.ember : colors.textMuted,
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
