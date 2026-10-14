import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { GlintCard } from '../../items/glint-card/glint-card';
import { useCountUp } from '../../shared/hooks/use-count-up';
import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { palettes, withAlpha } from '../../shared/tokens/tokens';

export type WalletCard = {
  id: string;
  /** Name on the card, e.g. "Kinetik Black". */
  name: string;
  /** Last four digits. */
  last4?: string;
  /** A CSS linear-gradient for the card face. Defaults to a theme-coloured one. */
  background?: string;
  /** Text colour on the face. Defaults to the theme highlight. */
  ink?: string;
};

export type WalletStackProps = {
  /** Up to four cards, back to front. */
  cards: readonly WalletCard[];
  balance: number;
  /** Defaults to "$". */
  currency?: string;
  /** Line above the balance. Defaults to "Total balance". */
  balanceLabel?: string;
  /** Title above the cards. Defaults to "Wallet". */
  title?: string;
  /** Called with a card when it is tapped while the wallet is open. */
  onCardPress?: (card: WalletCard) => void;
  /** A tick when the wallet opens and closes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const CARD_H = 150;
/** How much of each card shows above the pocket while closed, and when open. */
const PEEK = 30;
const SPREAD = 64;
const POCKET_H = 190;
/** Extra lift for the front card when open, so it clears the pocket's lip. */
const LIFT = 34;

/**
 * A wallet: cards (Glint Cards, catching the light as you tilt) tucked in a
 * stitched leather pocket. Tap it and the cards slide up and fan out; the
 * balance counts up on the pocket's face. Tap again to tuck them away.
 */
export function WalletStack({
  cards,
  balance,
  currency = '$',
  balanceLabel = 'Total balance',
  title = 'Wallet',
  onCardPress,
  haptics = true,
  style,
}: WalletStackProps) {
  const { radius, space, font, shadow } = useKinetikTheme();
  // Leather reads dark on either theme, like a real wallet.
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const deck = cards.slice(0, 4);
  const spread = useSharedValue(0);
  const shown = useCountUp(balance, { instant: reduced, duration: 1100 });

  useEffect(() => {
    spread.set(reduced ? (open ? 1 : 0) : withSpring(open ? 1 : 0, spring('bouncy')));
  }, [open, reduced, spread]);

  const toggle = () => {
    haptic('tap');
    setOpen((o) => !o);
  };

  const whole = Math.floor(shown);
  const cents = Math.round((shown - whole) * 100);
  const amount = `${currency} ${whole.toLocaleString('en-US')}`;
  const top = space[10] + 6;
  // Every card, the front one included, shows a strip above the pocket.
  const height = top + deck.length * PEEK + POCKET_H + 6;

  // Opening grows the wallet so the fanned cards have room above the pocket.
  const extra = Math.max(0, deck.length - 1) * (SPREAD - PEEK) + LIFT;
  const grow = useAnimatedStyle(() => ({ height: height + spread.get() * extra }));

  return (
    <Animated.View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.frame,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderStrong,
          borderRadius: radius.xl + 8,
          // No outer shadow: the frame grows as it opens, and a blurred shadow would redraw every frame.
        },
        style,
        grow,
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          {
            color: colors.textSubtle,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            top: space[3],
          },
        ]}
      >
        {title}
      </Text>

      {width > 0 &&
        deck.map((card, i) => (
          <Slot
            key={card.id}
            card={card}
            index={i}
            count={deck.length}
            top={top}
            width={width - space[6] * 2}
            spread={spread}
            open={open}
            interactive={open && !!onCardPress}
            onPress={() => onCardPress?.(card)}
          />
        ))}

      <View style={[styles.pocketSlot, { height: POCKET_H }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${balanceLabel} ${currency}${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accessibilityHint={open ? 'Tucks the cards away' : 'Shows the cards'}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={[
            styles.pocket,
            {
              borderRadius: radius.xl + 4,
              boxShadow: shadow.lg,
            },
            gradient(
              `linear-gradient(160deg, ${colors.surfaceRaised} 0%, ${colors.surfaceSunken} 45%, ${withAlpha(colors.danger, 0.55)} 100%)`,
            ),
          ]}
        >
          {/* Stitching around the edge. */}
          <View
            pointerEvents="none"
            style={[
              styles.stitch,
              { borderColor: withAlpha(colors.text, 0.28), borderRadius: radius.xl - 2 },
            ]}
          />
          {/* A soft sheen along the top lip. */}
          <View
            pointerEvents="none"
            style={[
              styles.lip,
              gradient(
                `linear-gradient(180deg, ${withAlpha(colors.highlight, 0.14)} 0%, ${withAlpha(colors.highlight, 0)} 100%)`,
              ),
            ]}
          />
          <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{balanceLabel}</Text>
          <Text
            style={{
              color: colors.text,
              fontSize: font.size['3xl'],
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
              marginTop: 4,
            }}
          >
            {amount}
            <Text style={{ color: colors.textSubtle, fontSize: font.size.xl }}>
              .{String(cents).padStart(2, '0')}
            </Text>
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function Slot({
  card,
  index,
  count,
  top,
  width,
  spread,
  open,
  interactive,
  onPress,
}: {
  card: WalletCard;
  index: number;
  count: number;
  top: number;
  width: number;
  spread: SharedValue<number>;
  open: boolean;
  interactive: boolean;
  onPress: () => void;
}) {
  const { space, font } = useKinetikTheme();
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  const fromFront = count - 1 - index;
  // Cards settle in one after another when the wallet first appears.
  const arrive = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) arrive.set(withDelay(150 + index * 90, withSpring(1, spring('smooth'))));
  }, [index, reduced, arrive]);

  const style = useAnimatedStyle(() => {
    const s = spread.get();
    // Closed: each card a little higher than the one in front. Open: lifted and fanned.
    const y = top + index * PEEK + s * (index * (SPREAD - PEEK)) + (1 - arrive.get()) * 80;
    const tilt = (index - (count - 1) / 2) * s * 3.5;
    return {
      opacity: arrive.get(),
      transform: [
        { translateY: y },
        { rotate: `${tilt}deg` },
        { scale: 1 - fromFront * 0.03 * (1 - s) },
      ],
    };
  });

  const face =
    card.background ??
    [
      `linear-gradient(135deg, ${colors.azure} 0%, ${colors.sky} 100%)`,
      `linear-gradient(135deg, ${colors.surfaceRaised} 0%, ${colors.textSubtle} 100%)`,
      `linear-gradient(135deg, ${colors.surfaceSunken} 0%, ${colors.surfaceRaised} 100%)`,
      `linear-gradient(135deg, ${colors.success} 0%, ${colors.azure} 100%)`,
    ][index % 4]!;
  const ink = card.ink ?? colors.highlight;

  return (
    <Animated.View
      pointerEvents={interactive ? 'auto' : 'none'}
      style={[styles.slot, { left: space[6], width, height: CARD_H }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.name}${card.last4 ? ` ending ${card.last4}` : ''}`}
        accessibilityElementsHidden={!interactive}
        importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
        disabled={!interactive}
        onPress={onPress}
        style={styles.fill}
      >
        <GlintCard
          // The light follows the finger: no motion sensors, so opening stays smooth.
          source="touch"
          active={open}
          tiltDegrees={0}
          intensity={0.55}
          radius={16}
          style={[styles.fill, gradient(face), { borderColor: withAlpha(ink, 0.35) }, styles.edge]}
          contentStyle={[styles.cardContent, { padding: space[4] }]}
        >
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: ink,
              fontSize: font.size.md,
              fontWeight: font.weight.heavy,
              fontStyle: 'italic',
              letterSpacing: 1,
            }}
          >
            {card.name.toUpperCase()}
          </Text>
          {card.last4 ? (
            <Text
              style={{
                color: ink,
                opacity: 0.8,
                fontSize: font.size.sm,
                fontVariant: ['tabular-nums'],
              }}
            >
              •••• {card.last4}
            </Text>
          ) : null}
        </GlintCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 3, overflow: 'hidden' },
  title: { position: 'absolute', alignSelf: 'center' },
  slot: { position: 'absolute', top: 0 },
  fill: { flex: 1 },
  edge: { borderWidth: 1.5 },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pocketSlot: { position: 'absolute', left: 6, right: 6, bottom: 6 },
  pocket: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stitch: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  lip: { position: 'absolute', top: 0, left: 0, right: 0, height: 26 },
});
