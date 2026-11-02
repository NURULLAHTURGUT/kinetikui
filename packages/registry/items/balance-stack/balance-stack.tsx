import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type BalanceAccount = {
  id: string;
  /** The account's balance. The figure counts to it when the card comes to the front. */
  balance: number;
  /** Last digits shown after the mask, e.g. "2048". */
  digits: string;
  /** Wordmark at the end of the card, e.g. "NOVA". */
  network?: string;
  /** Top and bottom colours of the card. Defaults to an indigo and lilac rotation. */
  tones?: [string, string];
  /** Colour of the digits. Defaults to match the rotation. */
  ink?: string;
};

export type BalanceStackProps = {
  /** One to three accounts. The last one starts at the front. */
  accounts: BalanceAccount[];
  label: string;
  /** Pill beside the label, e.g. "Earning". */
  status?: string;
  /** Symbol before the figure. Defaults to "$". */
  currency?: string;
  /** Id of the account at the front, if you control it. */
  selected?: string;
  /** Called when a card is tapped. */
  onSelect?: (id: string) => void;
  /** Vibrate on tap. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const CARD_H = 73;
/** How much of a card shows above the one in front of it. */
const PEEK = 61;
const LIFT = 14;

const TONES: { tones: [string, string]; ink: string }[] = [
  { tones: ['hsl(244, 76%, 59%)', 'hsl(236, 84%, 67%)'], ink: 'hsl(240, 100%, 97%)' },
  { tones: ['hsl(258, 90%, 74%)', 'hsl(258, 90%, 84%)'], ink: 'hsl(262, 72%, 36%)' },
  { tones: ['hsl(190, 76%, 42%)', 'hsl(186, 72%, 56%)'], ink: 'hsl(190, 90%, 12%)' },
];

/**
 * A dark balance card with payment cards stacked along its bottom edge. Tap the
 * card behind to pull it to the front; the figure counts to that account's
 * balance, its cents dimmed.
 */
export function BalanceStack({
  accounts,
  label,
  status,
  currency = '$',
  selected,
  onSelect,
  haptics = true,
  style,
}: BalanceStackProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const deck = accounts.slice(0, 3);
  const [own, setOwn] = useState(deck[deck.length - 1]?.id);
  const frontId = selected ?? own;
  const front = deck.find((a) => a.id === frontId) ?? deck[deck.length - 1];

  // Cents as a whole number, so the figure can never round to ".100".
  const shown = Math.round(useCountUp(front?.balance ?? 0, { instant: reduced }) * 100);
  const whole = Math.floor(shown / 100).toLocaleString('en-US');
  const cents = String(shown % 100).padStart(2, '0');
  const exact = (front?.balance ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const order = deck.filter((a) => a !== front).concat(front ? [front] : []);
  const pick = (id: string) => {
    haptic('tap');
    setOwn(id);
    onSelect?.(id);
  };

  return (
    <View
      style={[
        styles.card,
        gradient(
          'linear-gradient(180deg, hsl(0, 0%, 28%) 0%, hsl(0, 0%, 11%) 28%, hsl(0, 0%, 9%) 60%, hsl(0, 0%, 19%) 84%, hsl(262, 20%, 25%) 100%)',
        ),
        { borderColor: withAlpha(colors.highlight, 0.14) },
        style,
      ]}
    >
      <View
        accessible
        accessibilityLabel={`${label}, ${currency}${exact}${status ? `, ${status}` : ''}`}
        style={[styles.head, { paddingHorizontal: space[6] + 2, paddingTop: space[6] }]}
      >
        <View style={styles.row}>
          <Text
            numberOfLines={1}
            style={[
              styles.grow,
              { color: colors.highlight, fontSize: font.size.lg, fontWeight: font.weight.medium },
            ]}
          >
            {label}
          </Text>
          {status ? (
            <View style={[styles.pill, { borderRadius: radius.pill }]}>
              <Text
                style={{
                  color: PILL_INK,
                  fontSize: font.size.xs + 1,
                  fontWeight: font.weight.semibold,
                }}
              >
                {status}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.amount,
            {
              color: colors.highlight,
              fontSize: font.size['4xl'] - 4,
              fontWeight: font.weight.medium,
              letterSpacing: font.tracking.tight,
            },
          ]}
        >
          {currency}
          {whole}
          <Text style={{ color: withAlpha(colors.highlight, 0.42) }}>.{cents}</Text>
        </Text>
      </View>

      <View style={{ height: CARD_H + (deck.length - 1) * PEEK, marginBottom: space[2] + 2 }}>
        {deck.map((account, i) => (
          <StackCard
            key={account.id}
            account={account}
            tone={TONES[i % TONES.length]!}
            slot={order.indexOf(account)}
            front={account === front}
            entry={i}
            last={deck.length - 1}
            onPress={() => pick(account.id)}
          />
        ))}
      </View>
    </View>
  );
}

function StackCard({
  account,
  tone,
  slot,
  front,
  entry,
  last,
  onPress,
}: {
  account: BalanceAccount;
  tone: (typeof TONES)[number];
  slot: number;
  front: boolean;
  entry: number;
  /** Slot of the front card. */
  last: number;
  onPress: () => void;
}) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const y = useSharedValue(reduced ? slot * PEEK : slot * PEEK + CARD_H * 2);
  const lift = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    const to = slot * PEEK;
    const move = withSpring(to, spring('smooth'));
    // Cards arrive one after another; later moves start at once.
    y.set(reduced ? to : placed.current ? move : withDelay(entry * 60, move));
    placed.current = true;
  }, [slot, entry, reduced, y]);

  useEffect(() => {
    if (front && !reduced) {
      lift.set(withSequence(withSpring(-LIFT, spring('snappy')), withSpring(0, spring('bouncy'))));
    }
  }, [front, reduced, lift]);

  // A card behind runs down to the bottom of the stack, so it fills in behind the
  // rounded corners of the card in front of it.
  const frontY = last * PEEK;
  const place = useAnimatedStyle(() => ({
    height: Math.max(CARD_H, frontY + CARD_H - y.get()),
    transform: [{ translateY: y.get() + lift.get() }],
  }));
  // Its digits stay centred in the part that shows.
  const row = useAnimatedStyle(() => ({
    height: interpolate(y.get(), [frontY - PEEK, frontY], [PEEK, CARD_H], Extrapolation.CLAMP),
  }));
  const [top, bottom] = account.tones ?? tone.tones;
  const ink = account.ink ?? tone.ink;

  return (
    <Animated.View style={[styles.stackCard, { zIndex: slot }, place]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: front }}
        accessibilityLabel={`${account.network ? `${account.network} card` : 'Card'} ending ${account.digits}`}
        onPress={onPress}
        style={[
          styles.face,
          {
            backgroundColor: bottom,
            borderColor: withAlpha(colors.highlight, 0.28),
            borderRadius: radius.xl - 2,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.tone, gradient(`linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`)]}
        />
        <Animated.View style={[styles.content, { paddingHorizontal: space[6] + 2 }, row]}>
          <Text
            style={{
              color: ink,
              fontSize: font.size.lg,
              fontWeight: font.weight.medium,
              fontVariant: ['tabular-nums'],
            }}
          >
            **** {account.digits}
          </Text>
          {account.network ? (
            <Text
              style={{
                color: colors.highlight,
                fontSize: font.size.lg,
                fontWeight: font.weight.heavy,
                fontStyle: 'italic',
                opacity: 0.9,
              }}
            >
              {account.network}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const PILL_INK = 'hsl(145, 70%, 58%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    borderRadius: 36,
    borderWidth: 1,
    boxShadow: '0px 28px 56px hsla(258, 70%, 58%, 0.34)',
  },
  head: { paddingBottom: 26 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  pill: {
    paddingHorizontal: 14,
    height: 30,
    justifyContent: 'center',
    backgroundColor: 'hsl(150, 40%, 15%)',
    borderWidth: 1,
    borderColor: 'hsl(150, 34%, 24%)',
  },
  amount: { marginTop: 34, fontVariant: ['tabular-nums'] },
  stackCard: { position: 'absolute', top: 0, left: 10, right: 10 },
  face: { flex: 1, borderWidth: 1, overflow: 'hidden' },
  tone: { position: 'absolute', top: 0, left: 0, right: 0, height: CARD_H },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
