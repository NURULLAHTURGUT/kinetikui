import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ActionSheet } from './action-sheet';

export const controls = defineControls({
  showTitle: { type: 'boolean', label: 'Title', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function ActionSheetDemo({ showTitle, haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('Tap the photo for its actions.');

  return (
    <View style={{ gap: space[4], alignItems: 'center' }}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Photo actions"
        style={({ pressed }) => ({
          width: 220,
          height: 150,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceRaised,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Sunset at the pier</Text>
      </Pressable>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{last}</Text>
      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        haptics={haptics}
        title={showTitle ? 'Sunset at the pier.jpg' : undefined}
        message={showTitle ? '4.2 MB · Taken yesterday' : undefined}
        actions={[
          { label: 'Share', onPress: () => setLast('Shared.') },
          { label: 'Add to album', onPress: () => setLast('Added to Summer.') },
          { label: 'Set as wallpaper', onPress: () => setLast('Wallpaper set.') },
          { label: 'Delete photo', tone: 'danger', onPress: () => setLast('Moved to trash.') },
        ]}
      />
    </View>
  );
}
