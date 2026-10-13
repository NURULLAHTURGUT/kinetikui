import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type CompareSliderProps = {
  /** Shown left of the divider, e.g. the original photo. Fills the frame. */
  before: ReactNode;
  /** Shown right of the divider, e.g. the edited photo. Fills the frame. */
  after: ReactNode;
  /** Where the divider starts, 0 to 1. Defaults to 0.5. */
  initial?: number;
  /** Defaults to 'Before'. */
  beforeLabel?: string;
  /** Defaults to 'After'. */
  afterLabel?: string;
  /** Width over height. Defaults to 4 / 3. */
  aspectRatio?: number;
  /** Nudge the divider once on mount so people see it moves. Defaults to true. */
  hint?: boolean;
  /** Called when the finger lifts, with the divider's position, 0 to 1. */
  onPositionChange?: (position: number) => void;
  /** Names the comparison, e.g. "Colour grade". */
  accessibilityLabel: string;
  /** A tick at either end. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const KNOB = 40;
const LINE = 2;

/**
 * Two versions of a picture, one over the other, with a divider you drag
 * across to reveal either side. The labels step aside as the divider nears
 * them, and on first sight it nudges once to show that it moves.
 */
export function CompareSlider({
  before,
  after,
  initial = 0.5,
  beforeLabel = 'Before',
  afterLabel = 'After',
  aspectRatio = 4 / 3,
  hint = true,
  onPositionChange,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: CompareSliderProps) {
  const { colors, font, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const [shown, setShown] = useState(Math.round(initial * 100));
  const pos = useSharedValue(initial);
  const held = useSharedValue(0);
  const atEdge = useSharedValue(0);

  useEffect(() => {
    if (!hint || reduced || width === 0) return;
    pos.set(
      withDelay(
        500,
        withSequence(
          withTiming(Math.min(0.92, initial + 0.12), { duration: 420, easing: easings.inOut }),
          withSpring(initial, spring('smooth')),
        ),
      ),
    );
  }, [hint, reduced, width, initial, pos]);

  const report = (p: number) => {
    setShown(Math.round(p * 100));
    onPositionChange?.(p);
  };
  const tick = () => haptic('tick');

  const moveTo = (x: number) => {
    'worklet';
    if (width === 0) return;
    const p = Math.max(0, Math.min(1, x / width));
    pos.set(p);
    const edge = p === 0 || p === 1 ? 1 : 0;
    if (edge !== atEdge.get()) {
      atEdge.set(edge);
      if (edge) scheduleOnRN(tick);
    }
  };

  const pan = Gesture.Pan()
    .withTestId('compare-slider')
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onBegin(() => held.set(withSpring(1, spring('snappy', reduced))))
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => {
      held.set(withSpring(0, spring('smooth', reduced)));
      scheduleOnRN(report, pos.get());
    });
  const tap = Gesture.Tap()
    .withTestId('compare-slider-tap')
    .onEnd((e) => {
      if (width === 0) return;
      const p = Math.max(0, Math.min(1, e.x / width));
      pos.set(reduced ? p : withSpring(p, spring('smooth')));
      scheduleOnRN(report, p);
    });

  const clip = useAnimatedStyle(() => ({ width: pos.get() * width }));
  const divider = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.get() * width - LINE / 2 }],
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ scale: 1 + held.get() * 0.12 }] }));
  // A label fades as the divider comes within a fifth of the width of it.
  const leftTag = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, (pos.get() - 0.12) / 0.2)),
  }));
  const rightTag = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, (0.88 - pos.get()) / 0.2)),
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const step = e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1;
    const p = Math.max(0, Math.min(1, Math.round((pos.get() + step) * 10) / 10));
    pos.set(reduced ? p : withSpring(p, spring('smooth')));
    report(p);
  };

  const tag = (text: string) => (
    <View
      style={[
        styles.tag,
        { backgroundColor: withAlpha(colors.background, 0.55), borderRadius: radius.pill },
      ]}
    >
      <Text
        style={{ color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.semibold }}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        collapsable={false}
        testID={testID}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`Shows more of ${beforeLabel} or ${afterLabel}`}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: shown,
          text: `${shown}% ${beforeLabel.toLowerCase()}`,
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.frame,
          { aspectRatio, borderRadius: radius.xl, backgroundColor: colors.surfaceSunken },
          style,
        ]}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {after}
        </View>
        <Animated.View style={[styles.clip, clip]} pointerEvents="none">
          {/* Full width inside the clip, so the picture is cut, never squeezed. */}
          <View style={[styles.full, { width }]}>{before}</View>
        </Animated.View>

        <Animated.View style={[styles.tagLeft, leftTag]} pointerEvents="none">
          {tag(beforeLabel)}
        </Animated.View>
        <Animated.View style={[styles.tagRight, rightTag]} pointerEvents="none">
          {tag(afterLabel)}
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.divider, { backgroundColor: colors.ember }, divider]}
        >
          <Animated.View
            style={[styles.knob, { backgroundColor: colors.ember, boxShadow: shadow.md }, knob]}
          >
            <View style={[styles.arrow, styles.arrowLeft, { borderColor: colors.onEmber }]} />
            <View style={[styles.arrow, styles.arrowRight, { borderColor: colors.onEmber }]} />
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden' },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  full: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  tag: { paddingHorizontal: 10, paddingVertical: 4 },
  tagLeft: { position: 'absolute', left: 12, top: 12 },
  tagRight: { position: 'absolute', right: 12, top: 12 },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  arrow: { width: 7, height: 7, borderTopWidth: 2, borderLeftWidth: 2 },
  arrowLeft: { transform: [{ rotate: '-45deg' }] },
  arrowRight: { transform: [{ rotate: '135deg' }] },
});
