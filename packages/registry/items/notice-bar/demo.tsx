import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { NoticeBar } from './notice-bar';

export const controls = defineControls({
  tone: { type: 'select', label: 'Tone', options: ['azure', 'neutral'], default: 'azure' },
  interval: { type: 'number', label: 'Interval (s)', min: 2, max: 8, step: 1, default: 4 },
});

export default function NoticeBarDemo({ tone, interval }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState('');
  const ink = tone === 'azure' ? colors.onAzure : colors.azure;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
      ]}
    >
      {open ? (
        <NoticeBar
          tone={tone}
          interval={interval * 1000}
          leading={<DemoIcon name="sparkles" color={ink} size={16} />}
          onDismiss={() => setOpen(false)}
          messages={[
            {
              text: 'Spring prints are here',
              action: { label: 'Browse', onPress: () => setNote('Opened the spring collection.') },
            },
            { text: 'Free shipping on orders over $50' },
            {
              text: 'Gift cards in any amount',
              action: { label: 'Send one', onPress: () => setNote('Opened gift cards.') },
            },
          ]}
        />
      ) : null}
      <Image source={photo('pastelTide')} style={styles.hero} accessibilityIgnoresInvertColors />
      <View style={{ padding: space[5], gap: space[2] }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Pastel Tide, print
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {note || 'Hold the bar to pause it. Close it and the page slides up.'}
        </Text>
        {!open ? (
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.again}>
            <Text style={{ color: colors.azure, fontWeight: font.weight.semibold }}>
              Show the bar again
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hero: { width: '100%', height: 150 },
  again: { minHeight: minTouchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
});
