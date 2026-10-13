import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PopDialog } from './pop-dialog';

export const controls = defineControls({
  actions: { type: 'select', label: 'Actions', options: ['two', 'three'], default: 'two' },
  dismissable: { type: 'boolean', label: 'Tap outside closes', default: true },
});

export default function PopDialogDemo({ actions, dismissable }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('Nothing chosen yet.');
  const done = (what: string) => {
    setResult(what);
    setOpen(false);
  };

  return (
    <View style={{ gap: space[4], alignItems: 'center' }}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: 48,
          paddingHorizontal: space[6],
          justifyContent: 'center',
          borderRadius: radius.pill,
          backgroundColor: colors.ember,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text
          style={{
            color: colors.onEmber,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          Leave the group
        </Text>
      </Pressable>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{result}</Text>
      <PopDialog
        visible={open}
        onClose={() => setOpen(false)}
        dismissable={dismissable}
        title="Leave Weekend Hikers?"
        message="You will stop getting messages from this group. Someone will have to add you again to rejoin."
        actions={
          actions === 'two'
            ? [
                { label: 'Stay', onPress: () => done('You stayed.') },
                { label: 'Leave', tone: 'danger', onPress: () => done('You left the group.') },
              ]
            : [
                { label: 'Leave', tone: 'danger', onPress: () => done('You left the group.') },
                {
                  label: 'Mute instead',
                  tone: 'primary',
                  onPress: () => done('Muted for a week.'),
                },
                { label: 'Cancel', onPress: () => done('You stayed.') },
              ]
        }
      />
    </View>
  );
}
