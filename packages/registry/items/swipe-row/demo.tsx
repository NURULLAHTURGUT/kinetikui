import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { SwipeRow } from './swipe-row';

export const controls = defineControls({
  fullSwipe: { type: 'boolean', label: 'Full swipe', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const MAIL = [
  { id: 'a', from: 'Studio North', subject: 'Your prints are ready', time: '09:41' },
  { id: 'b', from: 'Lake House', subject: 'Check-in details for Friday', time: '08:15' },
  { id: 'c', from: 'Trail Club', subject: 'Ridge walk moved to Sunday', time: 'Mon' },
  { id: 'd', from: 'Field Notes', subject: 'Issue 12: the quiet season', time: 'Sun' },
];

export default function SwipeRowDemo({ fullSwipe, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [mail, setMail] = useState(MAIL);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
      ]}
    >
      {mail.map((m, i) => (
        <SwipeRow
          key={m.id}
          accessibilityLabel={`${m.from}, ${m.subject}`}
          fullSwipe={fullSwipe}
          haptics={haptics}
          leading={{
            key: 'pin',
            label: pinned.includes(m.id) ? 'Unpin' : 'Pin',
            tone: 'azure',
            icon: (c) => <DemoIcon name="bookmark" color={c} size={20} />,
            onPress: () => setPinned((p) => toggle(p, m.id)),
          }}
          trailing={[
            {
              key: 'delete',
              label: 'Delete',
              tone: 'danger',
              dismiss: true,
              icon: (c) => <DemoIcon name="trash" color={c} size={20} />,
              onPress: () => setMail((list) => list.filter((x) => x.id !== m.id)),
            },
            {
              key: 'flag',
              label: flagged.includes(m.id) ? 'Unflag' : 'Flag',
              tone: 'neutral',
              icon: (c) => <DemoIcon name="bolt" color={c} size={20} />,
              onPress: () => setFlagged((f) => toggle(f, m.id)),
            },
          ]}
        >
          <View
            style={[
              styles.row,
              {
                padding: space[4],
                gap: space[3],
                borderTopColor: colors.border,
                borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.azureSoft }]}>
              <Text style={{ color: colors.azure, fontWeight: font.weight.bold }}>
                {m.from.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.top}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.md,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {pinned.includes(m.id) ? '• ' : ''}
                  {m.from}
                </Text>
                <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{m.time}</Text>
              </View>
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                {flagged.includes(m.id) ? '⚑ ' : ''}
                {m.subject}
              </Text>
            </View>
          </View>
        </SwipeRow>
      ))}
      {mail.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setMail(MAIL)}
          style={[styles.restore, { padding: space[5] }]}
        >
          <Text style={{ color: colors.azure, fontWeight: font.weight.semibold }}>
            Inbox zero. Bring the mail back
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  restore: { alignItems: 'center', minHeight: minTouchTarget },
});
