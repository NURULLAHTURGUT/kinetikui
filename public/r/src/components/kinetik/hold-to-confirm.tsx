import { Canvas, Path } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic, type HapticKind } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type HoldToConfirmProps = {
  /** Label while idle, e.g. "Hold to delete". */
  label: string;
  /** Label once confirmed, e.g. "Deleted". */
  confirmedLabel?: string;
  onConfirm: () => void;
  /** Hold time in ms. Defaults to 1200. */
  duration?: number;
  /** `danger` for destructive actions. Defaults to `ember`. */
  tone?: 'ember' | 'danger';
  /** Return to idle this many ms after confirming. `null` stays confirmed. Defaults to 1800. */
  resetAfter?: number | null;
  disabled?: boolean;
  /** Ticks at a third and two thirds, success on confirm. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const RING = 28;
const STROKE = 3;
const R = RING / 2 - STROKE / 2;
// Circle starting at 12 o'clock, drawn clockwise.
const RING_PATH = `M ${RING / 2} ${STROKE / 2} A ${R} ${R} 0 1 1 ${RING / 2 - 0.01} ${STROKE / 2}`;
const CHECK_PATH = 'M 8.5 14.5 L 12.5 18.5 L 19.5 10';

/**
 * Press and hold to confirm. A ring fills around the icon and the button
 * floods with colour; letting go early unwinds it. On completion the ring
 * becomes a check mark.
 */
export function HoldToConfirm({
  label,
  confirmedLabel = 'Done',
  onConfirm,
  duration = 1200,
  tone = 'ember',
  resetAfter = 1800,
  disabled = false,
  haptics = true,
  style,
}: HoldToConfirmProps) {
  const { colors, radius, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const accent = tone === 'danger' ? colors.danger : colors.ember;
  const [confirmed, setConfirmed] = useState(false);

  const progress = useSharedValue(0);
  const check = useSharedValue(0);
  const press = useSharedValue(0);
  const holding = useSharedValue(false);
  // Mirrors `confirmed` on the UI thread so gesture callbacks see it immediately.
  const done = useSharedValue(false);

  useEffect(() => {
    if (!confirmed || resetAfter === null) return;
    const t = setTimeout(() => {
      done.set(false);
      setConfirmed(false);
      progress.set(withTiming(0, timing('base', reduced)));
      check.set(withTiming(0, timing('quick', reduced)));
    }, resetAfter);
    return () => clearTimeout(t);
  }, [confirmed, resetAfter, reduced, progress, check, done]);

  const play = (kind: HapticKind) => haptic(kind);
  const confirm = () => {
    setConfirmed(true);
    haptic('success');
    AccessibilityInfo.announceForAccessibility(confirmedLabel);
    onConfirm();
  };

  // Detents at a third and two thirds make the hold feel measured.
  useAnimatedReaction(
    () => (holding.get() ? Math.floor(progress.get() * 3) : 0),
    (step, prev) => {
      if (prev !== null && step > prev && step < 3) scheduleOnRN(play, 'tick');
    },
  );

  const finish = () => {
    'worklet';
    done.set(true);
    holding.set(false);
    progress.set(1);
    check.set(withTiming(1, timing('base', reduced)));
    press.set(withSpring(0, spring('bouncy', reduced)));
    scheduleOnRN(confirm);
  };

  const hold = Gesture.LongPress()
    .withTestId('hold-to-confirm')
    .enabled(!disabled)
    .minDuration(duration)
    .maxDistance(40)
    .onBegin(() => {
      if (done.get()) return;
      holding.set(true);
      press.set(withSpring(1, spring('snappy', reduced)));
      progress.set(withTiming(1, { duration, easing: Easing.linear }));
      scheduleOnRN(play, 'tap');
    })
    .onStart(() => {
      if (!done.get()) finish();
    })
    .onFinalize(() => {
      if (done.get()) return;
      holding.set(false);
      press.set(withSpring(0, spring('snappy', reduced)));
      progress.set(withSpring(0, spring('smooth', reduced)));
    });

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * (reduced ? 0.01 : 0.03) }],
  }));
  const floodStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const ringEnd = useDerivedValue(() => progress.get());
  const checkEnd = useDerivedValue(() => check.get());
  const ringOpacity = useDerivedValue(() => 1 - check.get() * 0.6);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled || confirmed) return;
    if (e.nativeEvent.actionName === 'longpress') {
      done.set(true);
      progress.set(1);
      check.set(withTiming(1, timing('base', reduced)));
      confirm();
    } else if (e.nativeEvent.actionName === 'activate') {
      AccessibilityInfo.announceForAccessibility(`${label}. Double tap and hold to confirm.`);
    }
  };

  return (
    <GestureDetector gesture={hold}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={confirmed ? confirmedLabel : label}
        accessibilityHint="Double tap and hold to confirm"
        accessibilityState={{ disabled: disabled || confirmed }}
        accessibilityActions={[{ name: 'activate' }, { name: 'longpress' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          styles.button,
          {
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceRaised,
            borderColor: withAlpha(accent, 0.5),
            paddingLeft: space[3],
            paddingRight: space[6],
            gap: space[3],
            opacity: disabled ? 0.45 : 1,
          },
          style,
          buttonStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.flood, { backgroundColor: withAlpha(accent, 0.22) }, floodStyle]}
        />
        <Canvas style={styles.ring} accessibilityElementsHidden importantForAccessibility="no">
          <Path
            path={RING_PATH}
            style="stroke"
            strokeWidth={STROKE}
            color={withAlpha(accent, 0.25)}
            start={0}
            end={1}
          />
          <Path
            path={RING_PATH}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            color={accent}
            start={0}
            end={ringEnd}
            opacity={ringOpacity}
          />
          <Path
            path={CHECK_PATH}
            style="stroke"
            strokeWidth={2.5}
            strokeCap="round"
            strokeJoin="round"
            color={accent}
            start={0}
            end={checkEnd}
          />
        </Canvas>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          {confirmed ? confirmedLabel : label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    minWidth: 200,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  flood: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  ring: { width: RING, height: RING },
});
