import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SideDrawer } from './side-drawer';

export const controls = defineControls({
  side: { type: 'select', label: 'Side', options: ['left', 'right'], default: 'left' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const ITEMS = [
  { key: 'inbox', label: 'Inbox', badge: '12' },
  { key: 'starred', label: 'Starred' },
  { key: 'sent', label: 'Sent' },
  { key: 'drafts', label: 'Drafts', badge: '2' },
  { key: 'archive', label: 'Archive' },
  { key: 'trash', label: 'Trash' },
];

export default function SideDrawerDemo({ side, haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('inbox');
  const current = ITEMS.find((i) => i.key === active)?.label;

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
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
        })}
      >
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium }}
        >
          Open the menu
        </Text>
      </Pressable>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Showing {current}</Text>
      <SideDrawer
        visible={open}
        onClose={() => setOpen(false)}
        side={side}
        haptics={haptics}
        items={ITEMS}
        active={active}
        onSelect={(key) => {
          setActive(key);
          setOpen(false);
        }}
        header={
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: font.size.lg,
                fontWeight: font.weight.semibold,
              }}
            >
              Mail
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>ada@studio.dev</Text>
          </View>
        }
        footer={
          <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
            Drag the panel back to close it.
          </Text>
        }
      />
    </View>
  );
}
