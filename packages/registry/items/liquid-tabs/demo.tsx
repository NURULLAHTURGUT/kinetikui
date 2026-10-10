import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { LiquidTabs } from './liquid-tabs';

export const controls = defineControls({
  tabs: { type: 'number', label: 'Tabs', min: 2, max: 5, step: 1, default: 4 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const ALL = [
  { key: 'for-you', label: 'For you' },
  { key: 'following', label: 'Following' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'saved', label: 'Saved' },
  { key: 'live', label: 'Live' },
];

export default function LiquidTabsDemo({ tabs, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const items = ALL.slice(0, tabs);
  const [value, setValue] = useState('for-you');
  const current = items.find((t) => t.key === value) ?? items[0]!;

  return (
    <View style={{ gap: space[6], paddingVertical: space[4] }}>
      <LiquidTabs
        tabs={items}
        value={current.key}
        onChange={setValue}
        haptics={haptics}
        accessibilityLabel="Feed"
      />
      <LiquidTabs
        tabs={items.slice(0, 3)}
        value={items.slice(0, 3).some((t) => t.key === value) ? value : 'for-you'}
        onChange={setValue}
        color={colors.ice}
        activeTextColor={colors.onIce}
        haptics={haptics}
        accessibilityLabel="Feed, compact"
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        Showing: {current.label}
      </Text>
    </View>
  );
}
