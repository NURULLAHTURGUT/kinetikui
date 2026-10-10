import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FlipLedger } from './flip-ledger';

export const controls = defineControls({
  axis: { type: 'select', label: 'Axis', options: ['y', 'x'], default: 'y' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const rows = [
  { label: 'Studio rent', amount: '−1,240.00', tone: 'out' },
  { label: 'Client · Northwind', amount: '+3,800.00', tone: 'in' },
  { label: 'Coffee beans', amount: '−18.50', tone: 'out' },
] as const;

export default function FlipLedgerDemo({ axis, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const muted = { color: colors.textMuted, fontSize: font.size.sm };

  return (
    <FlipLedger
      axis={axis}
      haptics={haptics}
      accessibilityLabel="October ledger. Balance 12,480 lira."
      front={
        <View style={{ gap: space[6] }}>
          <View style={styles.row}>
            <Text style={[styles.overline, { color: colors.textSubtle }]}>OCTOBER LEDGER</Text>
            <Text style={muted}>Tap to flip</Text>
          </View>
          <View style={{ gap: space[1] }}>
            <Text style={muted}>Balance</Text>
            <Text style={[styles.amount, { color: colors.text }]}>₺12,480.00</Text>
          </View>
          <View style={[styles.row, { gap: space[3] }]}>
            <Stat label="In" value="+3,800" color={colors.success} />
            <Stat label="Out" value="−1,258" color={colors.text} />
            <Stat label="Saved" value="20%" color={colors.ice} />
          </View>
        </View>
      }
      back={
        <View style={{ gap: space[3] }}>
          <Text style={[styles.overline, { color: colors.textSubtle }]}>RECENT</Text>
          {rows.map((r) => (
            <View
              key={r.label}
              style={[
                styles.row,
                styles.entry,
                { borderColor: colors.border, paddingVertical: space[2] },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: font.size.md }}>{r.label}</Text>
              <Text
                style={{
                  color: r.tone === 'in' ? colors.success : colors.textMuted,
                  fontSize: font.size.md,
                  fontWeight: font.weight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {r.amount}
              </Text>
            </View>
          ))}
        </View>
      }
    />
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors, font } = useKinetikTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{label}</Text>
      <Text
        style={{
          color,
          fontSize: font.size.md,
          fontWeight: font.weight.bold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entry: { borderBottomWidth: StyleSheet.hairlineWidth },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  amount: { fontSize: 34, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
