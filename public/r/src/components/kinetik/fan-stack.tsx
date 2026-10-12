import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type FanItem = {
  key: string;
  image: ImageSourcePropType;
  /** Names the card for screen readers. */
  title: string;
};

export type FanStackProps = {
  /** Two to seven pictures; the last one lies on top of the pile. */
  items: readonly FanItem[];
  /** Width of each card. Defaults to 148. */
  cardWidth?: number;
  /** Card height divided by width. Defaults to 1.3. */
  aspect?: number;
  /** Degrees between neighbouring cards when fanned. Defaults to 11. */
  spread?: number;
  /** Controlled fan state. Leave unset to let the stack keep its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the lifted card, or null when none is. */
  onSelect?: (index: number | null) => void;
  /** Names the pile for screen readers. Defaults to 'Photos'. */
  accessibilityLabel?: string;
  /** A tap as it fans out and a tick as a card lifts. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Each card's lie in the pile, in degrees: loose, never neat. */
const PILE = [-5, 4, -8, 7, -2, 6, -6];
/** Delay between cards as they fan out, in ms. */
const STAGGER = 24;

/**
 * A loose pile of pictures that fans out like a hand of cards. Tap the pile
 * to spread it; tap a card to lift it out of the fan, and tap it again to
 * gather them all back up.
 */
export function FanStack({
  items,
  cardWidth = 148,
  aspect = 1.3,
  spread = 11,
  open,
  onOpenChange,
  onSelect,
  accessibilityLabel = 'Photos',
  haptics = true,
  style,
}: FanStackProps) {
  const { radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [inner, setInner] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const isOpen = open ?? inner;
  const lifted = isOpen ? selected : null;

  const n = items.length;
  const height = Math.round(cardWidth * aspect);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const lift = (i: number | null) => {
    setSelected(i);
    onSelect?.(i);
  };

  const press = (i: number) => {
    if (!isOpen) {
      haptic('tap');
      setSelected(null);
      setOpen(true);
    } else if (lifted === i) {
      // A second tap on the lifted card gathers the pile.
      lift(null);
      setOpen(false);
    } else {
      haptic('tick');
      lift(i);
    }
  };

  return (
    <View
      style={[
        styles.stage,
        // Room for the fan's swing and the lifted card.
        { height: height + 64, minWidth: cardWidth * 2 },
        style,
      ]}
    >
      {items.map((item, i) => (
        <Card
          key={item.key}
          item={item}
          index={i}
          count={n}
          width={cardWidth}
          height={height}
          radius={radius.lg}
          spread={spread}
          open={isOpen}
          state={lifted === null ? 'rest' : lifted === i ? 'lifted' : 'behind'}
          reduced={reduced}
          // Closed, the pile is one control: the top card stands for it.
          role={isOpen ? 'card' : i === n - 1 ? 'pile' : 'hidden'}
          pileLabel={`${accessibilityLabel}, ${n} items`}
          onPress={() => press(i)}
        />
      ))}
    </View>
  );
}

function Card({
  item,
  index,
  count,
  width,
  height,
  radius,
  spread,
  open,
  state,
  reduced,
  role,
  pileLabel,
  onPress,
}: {
  item: FanItem;
  index: number;
  count: number;
  width: number;
  height: number;
  radius: number;
  spread: number;
  open: boolean;
  state: 'rest' | 'lifted' | 'behind';
  reduced: boolean;
  role: 'card' | 'pile' | 'hidden';
  pileLabel: string;
  onPress: () => void;
}) {
  const { colors, shadow } = useKinetikTheme();
  const fan = useSharedValue(open ? 1 : 0);
  const up = useSharedValue(state === 'lifted' ? 1 : 0);
  const dim = useSharedValue(state === 'behind' ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    // Out from the top of the pile down; back in the other way.
    const order = open ? count - 1 - index : index;
    const to = withSpring(open ? 1 : 0, spring(open ? 'bouncy' : 'smooth', reduced));
    fan.set(reduced ? to : withDelay(order * STAGGER, to));
  }, [open, index, count, reduced, fan]);
  useEffect(() => {
    up.set(withSpring(state === 'lifted' ? 1 : 0, spring('bouncy', reduced)));
    dim.set(withSpring(state === 'behind' ? 1 : 0, spring('smooth', reduced)));
  }, [state, reduced, up, dim]);

  const offset = index - (count - 1) / 2;
  const pile = PILE[index % PILE.length]!;
  const angle = offset * spread;
  const x = offset * width * 0.44;
  // Cards further from the middle dip, so the fan follows an arc.
  const dip = offset * offset * 5;

  const style = useAnimatedStyle(() => {
    const f = fan.get();
    const u = up.get();
    return {
      opacity: 1 - dim.get() * 0.35,
      transform: [
        { translateX: x * f },
        // Stacked a little higher card by card in the pile; on the arc when fanned.
        { translateY: -index * 1.5 + (dip + index * 1.5) * f - u * 30 },
        { rotate: `${pile + (angle - pile) * f - angle * 0.7 * u}deg` },
        { scale: (1 + u * 0.07) * (1 - pressed.get() * 0.03) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width,
          height,
          marginLeft: -width / 2,
          borderRadius: radius,
          boxShadow: shadow.lg,
          backgroundColor: colors.surfaceRaised,
          zIndex: state === 'lifted' ? count + 1 : index,
        },
        style,
      ]}
      accessibilityElementsHidden={role === 'hidden'}
      importantForAccessibility={role === 'hidden' ? 'no-hide-descendants' : 'auto'}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
        onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
        accessibilityRole="button"
        accessibilityLabel={role === 'pile' ? pileLabel : item.title}
        accessibilityHint={role === 'pile' ? 'Spreads them out' : undefined}
        accessibilityState={role === 'card' ? { selected: state === 'lifted' } : undefined}
        style={[styles.press, { borderRadius: radius, borderColor: colors.border }]}
      >
        <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', alignItems: 'center' },
  card: {
    position: 'absolute',
    left: '50%',
    bottom: 24,
    // Turns about the bottom edge, like cards held in a hand.
    transformOrigin: 'bottom',
  },
  press: { flex: 1, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
