import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { gradient } from '../../shared/tokens/gradient';
import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type CarouselItem = {
  key: string;
  image: ImageSourcePropType;
  title?: string;
  subtitle?: string;
  /** Accessible description of the image. Defaults to the title. */
  accessibilityLabel?: string;
};

export type ParallaxCarouselProps = {
  items: readonly CarouselItem[];
  /** Card width as a share of the carousel's width, 0.5–0.95. Defaults to 0.78. */
  cardWidth?: number;
  /** Card height divided by width. Defaults to 1.25. */
  aspect?: number;
  /** How far the image drifts inside its card, 0–1. Defaults to 0.6. */
  parallax?: number;
  /** Space between cards. Defaults to 14. */
  gap?: number;
  /** Thin progress line under the cards. Defaults to true. */
  showProgress?: boolean;
  /** Called when the centre card is tapped. A tap on a side card brings it to the centre. */
  onPress?: (item: CarouselItem, index: number) => void;
  /** Called when a new card reaches the centre. */
  onIndexChange?: (index: number) => void;
  /** A tick as each card reaches the centre. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Width of the progress line. */
const TRACK = 72;

/**
 * A paging carousel where each picture sits a little behind its card: as
 * cards slide past, the images move more slowly than the frames that hold
 * them. The centre card comes forward and its caption drifts in. Drag it with
 * a finger or a mouse; a flick carries on to the next cards.
 */
export function ParallaxCarousel({
  items,
  cardWidth = 0.78,
  aspect = 1.25,
  parallax = 0.6,
  gap = 14,
  showProgress = true,
  onPress,
  onIndexChange,
  haptics = true,
  testID,
  style,
}: ParallaxCarouselProps) {
  const { colors, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const offset = useSharedValue(0);
  const start = useSharedValue(0);

  const cardW = Math.round(width * Math.max(0.5, Math.min(0.95, cardWidth)));
  const step = cardW + gap;
  const side = (width - cardW) / 2;
  const height = Math.round(cardW * aspect);
  const last = Math.max(0, items.length - 1);

  const arrive = (next: number) => {
    setIndex(next);
    haptic('tick');
    onIndexChange?.(next);
  };
  // The centre card, reported once per change: live while dragging, and when a card settles.
  const current = useSharedValue(0);
  const report = (i: number) => {
    'worklet';
    if (i === current.get()) return;
    current.set(i);
    scheduleOnRN(arrive, i);
  };
  useAnimatedReaction(
    () => (step > 0 ? Math.max(0, Math.min(last, Math.round(offset.get() / step))) : 0),
    (next, before) => {
      if (before !== null && next !== before) report(next);
    },
    [step, last],
  );

  const settleOn = (i: number, velocity = 0) => {
    'worklet';
    const target = Math.max(0, Math.min(last, i));
    offset.set(withSpring(target * step, spring('smooth', reduced, velocity)));
    report(target);
  };

  const press = (i: number) => {
    const item = items[i];
    if (item) onPress?.(item, i);
  };

  // Past either end the row resists like rubber; a flick carries on to the
  // next cards, up to three at a time.
  const pan = Gesture.Pan()
    .withTestId('parallax-carousel')
    .enabled(items.length > 1 && step > 0)
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      start.set(offset.get());
    })
    .onUpdate((e) => {
      const raw = start.get() - e.translationX;
      const max = last * step;
      const over = raw < 0 ? raw : raw > max ? raw - max : 0;
      offset.set(raw - over * 0.65);
    })
    .onEnd((e) => {
      const from = Math.round(start.get() / step);
      const nearest = Math.round((offset.get() - e.velocityX * 0.18) / step);
      // A deliberate swipe always moves at least one card.
      const next =
        nearest === from && Math.abs(e.translationX) > step * 0.18
          ? from - Math.sign(e.translationX)
          : Math.max(from - 3, Math.min(from + 3, nearest));
      settleOn(next, -e.velocityX);
    });

  // A tap on the centre card presses it; a tap on a side card brings it over.
  const tap = Gesture.Tap()
    .withTestId('parallax-carousel-tap')
    .enabled(step > 0)
    .maxDistance(8)
    .onEnd((e, ok) => {
      if (!ok) return;
      const i = Math.floor((e.x - side + offset.get() + gap / 2) / step);
      if (i < 0 || i > last) return;
      if (i === Math.round(offset.get() / step)) scheduleOnRN(press, i);
      else settleOn(i);
    });

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: side - offset.get() }] }));

  const progress = useAnimatedStyle(() => {
    const span = Math.max(1, last * step);
    const t = Math.max(0, Math.min(1, offset.get() / span));
    const thumb = 1 / Math.max(1, items.length);
    return {
      width: `${thumb * 100}%`,
      transform: [{ translateX: t * (1 - thumb) * TRACK }],
    };
  });

  const onAccessibilityAction = (i: number) => (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') press(i);
    else if (name === 'next') settleOn(index + 1);
    else if (name === 'previous') settleOn(index - 1);
  };

  return (
    <View
      testID={testID}
      style={[{ gap: space[4] }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
          <View collapsable={false} style={[styles.window, { height: height + 14 }]}>
            <Animated.View style={[styles.row, { gap }, row]}>
              {items.map((item, i) => (
                <Card
                  key={item.key}
                  item={item}
                  index={i}
                  active={i === index}
                  width={cardW}
                  height={height}
                  step={step}
                  offset={offset}
                  parallax={reduced ? 0 : Math.max(0, Math.min(1, parallax))}
                  still={reduced}
                  radius={radius.xl}
                  pressable={Boolean(onPress)}
                  onAccessibilityAction={onAccessibilityAction(i)}
                />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      )}
      {showProgress && items.length > 1 && (
        <View
          style={[styles.track, { backgroundColor: colors.track }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View style={[styles.thumb, { backgroundColor: colors.text }, progress]} />
        </View>
      )}
    </View>
  );
}

function Card({
  item,
  index,
  active,
  width,
  height,
  step,
  offset,
  parallax,
  still,
  radius,
  pressable,
  onAccessibilityAction,
}: {
  item: CarouselItem;
  index: number;
  active: boolean;
  width: number;
  height: number;
  step: number;
  offset: SharedValue<number>;
  parallax: number;
  still: boolean;
  radius: number;
  pressable: boolean;
  onAccessibilityAction: (e: AccessibilityActionEvent) => void;
}) {
  const { colors, font, space, shadow, scheme } = useKinetikTheme();
  // Captions sit on black ink in both schemes; they are drawn over a picture.
  const ink = scheme === 'dark' ? colors.background : colors.text;
  // The image is wider than its card so it has room to drift.
  const extra = width * 0.35 * parallax;

  const frame = useAnimatedStyle(() => {
    if (still) return {};
    const d = Math.abs((offset.get() - index * step) / step);
    return {
      transform: [
        { scale: interpolate(d, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
        { translateY: interpolate(d, [0, 1], [0, 10], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(d, [0, 1.2], [1, 0.55], Extrapolation.CLAMP),
    };
  });
  const picture = useAnimatedStyle(() => {
    const d = (offset.get() - index * step) / step;
    return {
      transform: [
        { translateX: interpolate(d, [-1, 1], [-extra / 2, extra / 2], Extrapolation.CLAMP) },
      ],
    };
  });
  const caption = useAnimatedStyle(() => {
    if (still) return {};
    const d = (offset.get() - index * step) / step;
    return {
      opacity: interpolate(Math.abs(d), [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(d, [-1, 1], [40, -40], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[{ width, height }, frame]}>
      <View
        accessible
        accessibilityRole={pressable ? 'button' : 'image'}
        accessibilityLabel={item.accessibilityLabel ?? item.title}
        accessibilityState={{ selected: active }}
        accessibilityActions={[
          ...(pressable ? [{ name: 'activate' }] : []),
          { name: 'next', label: 'Next card' },
          { name: 'previous', label: 'Previous card' },
        ]}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          styles.card,
          { borderRadius: radius, backgroundColor: colors.surfaceSunken, boxShadow: shadow.lg },
        ]}
      >
        <Animated.View style={[styles.picture, { left: -extra / 2, right: -extra / 2 }, picture]}>
          <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Animated.View>
        {item.title || item.subtitle ? (
          <View
            pointerEvents="none"
            style={[
              styles.scrim,
              { padding: space[5] },
              gradient(
                `linear-gradient(180deg, ${withAlpha(ink, 0)} 0%, ${withAlpha(ink, 0)} 45%, ${withAlpha(ink, 0.78)} 100%)`,
              ),
            ]}
          >
            <Animated.View style={caption}>
              {item.subtitle ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.highlight,
                    opacity: 0.75,
                    fontSize: font.size.xs,
                    fontWeight: font.weight.semibold,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.subtitle}
                </Text>
              ) : null}
              {item.title ? (
                <Text
                  numberOfLines={2}
                  style={{
                    color: colors.highlight,
                    fontSize: font.size.xl,
                    fontWeight: font.weight.bold,
                    letterSpacing: -0.4,
                    marginTop: 4,
                  }}
                >
                  {item.title}
                </Text>
              ) : null}
            </Animated.View>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  card: { flex: 1, overflow: 'hidden' },
  picture: { position: 'absolute', top: 0, bottom: 0 },
  scrim: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  track: { alignSelf: 'center', width: TRACK, height: 3, borderRadius: 2, overflow: 'hidden' },
  thumb: { height: '100%', borderRadius: 2 },
});
