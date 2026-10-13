import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TipBubble } from './tip-bubble';

export const controls = defineControls({
  align: { type: 'select', label: 'Align', options: ['start', 'center', 'end'], default: 'center' },
  duration: { type: 'number', label: 'Closes after (s)', min: 0, max: 8, step: 1, default: 4 },
});

const ROWS = [
  { label: '4 nights × $184', amount: '$736' },
  {
    label: 'Cleaning fee',
    amount: '$60',
    tip: 'A one-off fee the host charges to clean the place after your stay.',
  },
  {
    label: 'Service fee',
    amount: '$98',
    tip: 'Covers payment processing and support around the clock.',
  },
];

function InfoMark() {
  const { colors, font } = useKinetikTheme();
  return (
    <View style={[styles.mark, { borderColor: colors.textMuted }]}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: font.weight.bold }}>i</Text>
    </View>
  );
}

export default function TipBubbleDemo({ align, duration }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          paddingTop: space[16],
          gap: space[4],
        },
      ]}
    >
      <Text
        style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
      >
        Price details
      </Text>
      {ROWS.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.label}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{row.label}</Text>
            {row.tip ? (
              <TipBubble
                content={row.tip}
                accessibilityLabel={`About the ${row.label.toLowerCase()}`}
                align={align}
                duration={duration * 1000}
              >
                <InfoMark />
              </TipBubble>
            ) : null}
          </View>
          <Text style={{ color: colors.text, fontSize: font.size.md }}>{row.amount}</Text>
        </View>
      ))}
      <View style={[styles.row, styles.total, { borderTopColor: colors.border }]}>
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          Total
        </Text>
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          $894
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  total: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
