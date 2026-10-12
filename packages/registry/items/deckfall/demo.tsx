import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DemoIcon, type DemoIconName } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { gradient } from '../../shared/tokens/gradient';
import { withAlpha } from '../../shared/tokens/tokens';
import { Deckfall, type DeckfallHandle } from './deckfall';

export const controls = defineControls({
  visible: { type: 'number', label: 'Visible cards', min: 1, max: 4, step: 1, default: 3 },
  threshold: {
    type: 'number',
    label: 'Swipe threshold',
    min: 0.15,
    max: 0.6,
    step: 0.05,
    default: 0.3,
  },
});

type Place = { name: string; city: string; note: string; tone: 'ember' | 'ice' };
const PLACES: Place[] = [
  {
    name: 'Harbour Lights',
    city: 'Lisbon',
    note: 'Trams, tiles and the river at dusk',
    tone: 'ember',
  },
  { name: 'Glass Lake', city: 'Banff', note: 'Still water under the peaks', tone: 'ice' },
  { name: 'Old Quarter', city: 'Prague', note: 'Cobbled lanes and copper roofs', tone: 'ember' },
  { name: 'Salt Flats', city: 'Utah', note: 'A mirror as far as you can see', tone: 'ice' },
  { name: 'Cliff Walk', city: 'Cornwall', note: 'Wild coast, quiet coves', tone: 'ember' },
];

export default function DeckfallDemo({ visible, threshold }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const deck = useRef<DeckfallHandle>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [round, setRound] = useState(0);

  return (
    <View style={{ gap: space[5] }}>
      <Deckfall
        key={round}
        ref={deck}
        data={PLACES}
        visible={visible}
        threshold={threshold}
        leftLabel="Skip"
        rightLabel="Save"
        keyExtractor={(p) => p.name}
        onSwipe={(p, dir) => {
          if (dir === 'right') setSaved((s) => [...s, p.name]);
        }}
        renderEmpty={() => (
          <Pressable accessibilityRole="button" onPress={() => setRound((r) => r + 1)}>
            <Text style={{ color: colors.ember, fontWeight: font.weight.semibold }}>
              Start over
            </Text>
          </Pressable>
        )}
        style={{ height: 300 }}
        renderCard={(p) => (
          <View style={styles.fill}>
            <View
              style={[
                styles.art,
                gradient(
                  `linear-gradient(160deg, ${p.tone === 'ember' ? colors.ember : colors.ice} 0%, ${colors.surfaceSunken} 100%)`,
                ),
              ]}
            />
            <View style={{ padding: space[5], gap: 2 }}>
              <Text
                style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}
              >
                {p.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                {p.city} · {p.note}
              </Text>
            </View>
          </View>
        )}
      />
      <View style={[styles.row, { gap: space[3] }]}>
        <DeckButton
          label="Skip"
          icon="close"
          accent={colors.danger}
          onPress={() => deck.current?.swipe('left')}
        />
        <DeckButton
          label="Save"
          icon="heart"
          accent={colors.success}
          onPress={() => deck.current?.swipe('right')}
        />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        {saved.length ? `Saved: ${saved.join(', ')}` : 'Drag a card sideways or use the buttons'}
      </Text>
    </View>
  );
}

function DeckButton({
  label,
  icon,
  accent,
  onPress,
}: {
  label: string;
  icon: DemoIconName;
  accent: string;
  onPress: () => void;
}) {
  const { colors, font, radius } = useKinetikTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: withAlpha(accent, 0.5),
          backgroundColor: pressed ? withAlpha(accent, 0.15) : colors.surface,
          borderRadius: radius.pill,
        },
      ]}
    >
      <DemoIcon name={icon} color={accent} size={20} strokeWidth={2} />
      <Text style={{ color: accent, fontWeight: font.weight.bold, fontSize: font.size.md }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  art: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    gap: 8,
    minWidth: 120,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
