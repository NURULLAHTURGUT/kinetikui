import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
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
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { gradient } from '../../shared/tokens/gradient';
import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type SlideConfirmProps = {
  /** Instruction on the track, e.g. "Slide to pay". */
  label: string;
  /** Shown once confirmed, e.g. "Paid". Defaults to 'Done'. */
  confirmedLabel?: string;
  onConfirm: () => void;
  /** Share of the track the knob must pass to confirm, 0.5–0.95. Defaults to 0.8. */
  threshold?: number;
  /** Return to the start this many ms after confirming. `null` stays confirmed. Defaults to 1800. */
  resetAfter?: number | null;
  disabled?: boolean;
  /** A tick when the knob passes the threshold and success on confirm. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 64;
const INSET = 4;
const KNOB = HEIGHT - INSET * 2;

const CHEVRONS = Skia.Path.MakeFromSVGString('M6 6 L12 12 L6 18 M12 6 L18 12 L12 18')!;
const CHECK = Skia.Path.MakeFromSVGString('M5.5 12.5 L10 17 L18.5 7.5')!;

/**
 * Slide to confirm. A trail fills behind the knob as it is dragged, a soft
 * light sweeps the track to invite the gesture, and past the threshold the
 * knob runs to the end and turns into a check. Let go early and it springs
 * back.
 */
export function SlideConfirm({
  label,
  confirmedLabel = 'Done',
  onConfirm,
  threshold = 0.8,
  resetAfter = 1800,
  disabled = false,
  haptics = true,
  style,
}: SlideConfirmProps) {
  const { colors, font, radius, scheme, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const limit = Math.max(0.5, Math.min(0.95, threshold));

  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const max = Math.max(0, width - KNOB - INSET * 2);

  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const held = useSharedValue(0);
  const sweep = useSharedValue(0);
  const confirmed = useSharedValue(0);

  // A light passes over the track every few seconds while it waits.
  useEffect(() => {
    if (reduced || done || disabled) {
      sweep.set(0);
      return;
    }
    sweep.set(
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, false),
    );
  }, [reduced, done, disabled, sweep]);

  useEffect(() => {
    if (!done || resetAfter === null) return;
    const t = setTimeout(() => {
      setDone(false);
      confirmed.set(withTiming(0, timing('base', reduced)));
      x.set(withSpring(0, spring('smooth', reduced)));
    }, resetAfter);
    return () => clearTimeout(t);
  }, [done, resetAfter, reduced, confirmed, x]);

  const complete = () => {
    setDone(true);
    haptic('success');
    onConfirm();
  };
  const armed = () => haptic('tick');

  // Tick once as the knob crosses the threshold.
  useAnimatedReaction(
    () => max > 0 && x.get() >= max * limit,
    (now, before) => {
      if (now && before === false && held.get() > 0) scheduleOnRN(armed);
    },
  );

  const finish = () => {
    'worklet';
    x.set(withSpring(max, spring('snappy', reduced)));
    confirmed.set(withTiming(1, timing('base', reduced)));
    scheduleOnRN(complete);
  };

  const pan = Gesture.Pan()
    .withTestId('slide-confirm')
    .enabled(!disabled && !done && max > 0)
    .minDistance(2)
    .onBegin(() => {
      start.set(x.get());
      held.set(withSpring(1, spring('snappy', reduced)));
    })
    .onUpdate((e) => {
      x.set(Math.max(0, Math.min(max, start.get() + e.translationX)));
    })
    .onEnd((e) => {
      const fast = e.velocityX > 900 && x.get() > max * 0.45;
      if (x.get() >= max * limit || fast) finish();
      else x.set(withSpring(0, spring('bouncy', reduced, reduced ? 0 : e.velocityX)));
    })
    .onFinalize(() => {
      held.set(withSpring(0, spring('smooth', reduced)));
    });

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scale: 1 + held.get() * 0.04 }],
  }));
  const trail = useAnimatedStyle(() => ({
    width: x.get() + KNOB,
    // A faint trail while dragging; it floods once confirmed so the label reads on it.
    opacity: (max > 0 ? interpolate(x.get(), [0, max], [0, 0.22]) : 0) + confirmed.get() * 0.78,
  }));
  const hint = useAnimatedStyle(() => ({
    opacity: max > 0 ? Math.max(0, 1 - (x.get() / max) * 1.8) * (1 - confirmed.get()) : 1,
    transform: [{ translateX: max > 0 ? (x.get() / max) * 24 : 0 }],
  }));
  const thanks = useAnimatedStyle(() => ({
    opacity: confirmed.get(),
    transform: [{ scale: 0.92 + confirmed.get() * 0.08 }],
  }));
  const light = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + sweep.get() * (width + 320) }],
  }));
  const chevrons = useAnimatedStyle(() => ({ opacity: 1 - confirmed.get() }));
  const check = useAnimatedStyle(() => ({
    opacity: confirmed.get(),
    transform: [{ scale: 0.6 + confirmed.get() * 0.4 }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName !== 'activate' || disabled || done || max <= 0) return;
    x.set(withSpring(max, spring('snappy', reduced)));
    confirmed.set(withTiming(1, timing('base', reduced)));
    complete();
  };

  const shine = scheme === 'dark' ? colors.highlight : colors.text;

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={done ? confirmedLabel : label}
      accessibilityHint={done ? undefined : 'Double tap to confirm'}
      accessibilityState={{ disabled: disabled || done }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        {
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.light,
          gradient(
            `linear-gradient(100deg, ${withAlpha(shine, 0)} 0%, ${withAlpha(shine, 0.09)} 50%, ${withAlpha(shine, 0)} 100%)`,
          ),
          light,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.trail, { backgroundColor: colors.ember, borderRadius: radius.pill }, trail]}
      />
      <Animated.View pointerEvents="none" style={[styles.center, hint]}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.textMuted,
            fontSize: font.size.md,
            fontWeight: font.weight.medium,
          }}
        >
          {label}
        </Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.center, styles.full, thanks]}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.onEmber,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          {confirmedLabel}
        </Text>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          collapsable={false}
          style={[styles.knob, { backgroundColor: colors.ember, boxShadow: shadow.md }, knob]}
        >
          <Animated.View style={[styles.glyph, chevrons]} pointerEvents="none">
            <Canvas style={StyleSheet.absoluteFill}>
              <Path
                path={CHEVRONS}
                style="stroke"
                strokeWidth={2.2}
                strokeCap="round"
                strokeJoin="round"
                color={colors.onEmber}
              />
            </Canvas>
          </Animated.View>
          <Animated.View style={[styles.glyph, check]} pointerEvents="none">
            <Canvas style={StyleSheet.absoluteFill}>
              <Path
                path={CHECK}
                style="stroke"
                strokeWidth={2.4}
                strokeCap="round"
                strokeJoin="round"
                color={colors.onEmber}
              />
            </Canvas>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  light: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 160 },
  trail: { position: 'absolute', left: INSET, top: INSET, bottom: INSET },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: KNOB,
  },
  full: { paddingLeft: 0 },
  knob: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { position: 'absolute', width: 24, height: 24 },
});
