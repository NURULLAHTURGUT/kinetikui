import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DemoIcon, type DemoIconName } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { EmptyState } from './empty-state';

export const controls = defineControls({
  kind: {
    type: 'select',
    label: 'Screen',
    options: ['saved', 'search', 'inbox'],
    default: 'saved',
  },
});

const SCREENS: Record<
  'saved' | 'search' | 'inbox',
  { icon: DemoIconName; title: string; description: string; action: string; secondary: string }
> = {
  saved: {
    icon: 'bookmark',
    title: 'No saved places yet',
    description: 'Tap the bookmark on any place you like and it will wait for you here.',
    action: 'Explore places',
    secondary: 'How saving works',
  },
  search: {
    icon: 'search',
    title: 'Nothing matches “fjord”',
    description: 'Check the spelling, or try a wider area or fewer filters.',
    action: 'Clear filters',
    secondary: 'Search everywhere',
  },
  inbox: {
    icon: 'inbox',
    title: 'You are all caught up',
    description: 'New messages from hosts and guides will land here.',
    action: 'Plan a trip',
    secondary: 'Notification settings',
  },
};

export default function EmptyStateDemo({ kind }: ControlValues<typeof controls>) {
  const { colors, space, radius } = useKinetikTheme();
  const [plays, setPlays] = useState(0);
  const screen = SCREENS[kind];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: radius.xl,
          paddingVertical: space[8],
          paddingHorizontal: space[5],
        },
      ]}
    >
      <EmptyState
        playKey={`${kind}-${plays}`}
        icon={<DemoIcon name={screen.icon} color={colors.azure} size={20} />}
        title={screen.title}
        description={screen.description}
        action={{ label: screen.action, onPress: () => setPlays((p) => p + 1) }}
        secondaryAction={{ label: screen.secondary, onPress: () => setPlays((p) => p + 1) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
