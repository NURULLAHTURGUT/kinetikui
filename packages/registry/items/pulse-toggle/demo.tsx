import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PulseToggle } from './pulse-toggle';

export const controls = defineControls({
  size: { type: 'select', label: 'Size', options: ['md', 'sm'], default: 'md' },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function PulseToggleDemo({ size, disabled }: ControlValues<typeof controls>) {
  const { colors, radius, space } = useKinetikTheme();
  const [state, setState] = useState({ alerts: true, focus: false, autoplay: false });

  return (
    <View
      style={[
        styles.list,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: space[4],
        },
      ]}
    >
      <PulseToggle
        size={size}
        disabled={disabled}
        label="Release alerts"
        description="A nudge when a new build is ready"
        value={state.alerts}
        onValueChange={(alerts) => setState((s) => ({ ...s, alerts }))}
        style={styles.item}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <PulseToggle
        size={size}
        disabled={disabled}
        label="Focus mode"
        description="Mute everything but mentions"
        value={state.focus}
        onValueChange={(focus) => setState((s) => ({ ...s, focus }))}
        activeColor={colors.ice}
        style={styles.item}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <PulseToggle
        size={size}
        disabled={disabled}
        label="Autoplay previews"
        value={state.autoplay}
        onValueChange={(autoplay) => setState((s) => ({ ...s, autoplay }))}
        style={styles.item}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: StyleSheet.hairlineWidth },
  item: { paddingVertical: 12 },
  divider: { height: StyleSheet.hairlineWidth },
});
