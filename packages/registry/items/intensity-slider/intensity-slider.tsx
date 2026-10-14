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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type IntensitySliderProps = {
  /** 0–100. */
  value: number;
  /** Called on each whole step while dragging. */
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  /** Heading above the track. Defaults to "Intensity". */
  label?: string;
  /** Words under the ends of the track. Default to "Low" and "High". */
  lowLabel?: string;
  highLabel?: string;
  /** Number of tick marks between the end labels. Defaults to 24. */
  ticks?: number;
  /** Fill colour. Defaults to the theme sky blue. */
  color?: string;
  disabled?: boolean;
  /** A tick each time the fill crosses a mark. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TRACK = 22;

/**
 * A wide, soft slider in a card: a pale gradient fills the track up to a
 * slim handle, the handle grows while held, and the ruler underneath lights
 * up to the value, ticking as the fill passes each mark.
 */
export function IntensitySlider({
  value,
  onValueChange,
  onSlidingComplete,
  label = 'Intensity',
  lowLabel = 'Low',
  highLabel = 'High',
  ticks = 24,
  color,
  disabled = false,
  haptics = true,
  style,
}: IntensitySliderProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const fillColor = color ?? colors.sky;

  const width = useSharedValue(0);
  const progress = useSharedValue(value / 100);
  const held = useSharedValue(0);
  const committed = useSharedValue(Math.round(value));
  const dragging = useSharedValue(false);
  const [shown, setShown] = useState<number | null>(null);
  const now = shown ?? Math.round(value);

  useEffect(() => {
    if (dragging.get()) return;
    const p = Math.max(0, Math.min(100, value)) / 100;
    progress.set(reduced ? p : withSpring(p, spring('smooth')));
    committed.set(Math.round(value));
  }, [value, reduced, progress, committed, dragging]);

  const emit = (v: number, tick: boolean) => {
    setShown(v);
    onValueChange?.(v);
    if (tick) haptic('tick');
  };
  const complete = (v: number) => {
    setShown(null);
    onSlidingComplete?.(v);
  };

  const moveTo = (x: number) => {
    'worklet';
    const w = width.get();
    if (w <= 0) return;
    const p = Math.max(0, Math.min(1, x / w));
    progress.set(p);
    const v = Math.round(p * 100);
    const before = committed.get();
    if (v !== before) {
      committed.set(v);
      // Tick when the value crosses a ruler mark.
      const mark = (n: number) => Math.floor((n / 100) * (ticks + 1));
      scheduleOnRN(emit, v, mark(v) !== mark(before));
    }
  };

  const release = () => {
    'worklet';
    dragging.set(false);
    held.set(withSpring(0, spring('smooth', reduced)));
    scheduleOnRN(complete, committed.get());
  };

  const pan = Gesture.Pan()
    .withTestId('intensity-slider')
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragging.set(true);
      held.set(withSpring(1, spring('snappy', reduced)));
    })
    .onStart((e) => moveTo(e.x))
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => release());

  const tap = Gesture.Tap()
    .withTestId('intensity-slider-tap')
    .enabled(!disabled)
    .onEnd((e) => {
      moveTo(e.x);
      release();
    });

  const fill = useAnimatedStyle(() => ({
    width: Math.max(TRACK / 2, progress.get() * width.get()),
  }));
  const handle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.max(6, progress.get() * width.get()) - 8 },
      { scaleY: 1 + held.get() * 0.35 },
      { scaleX: 1 + held.get() * 0.5 },
    ],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const v = Math.max(
      0,
      Math.min(100, committed.get() + (e.nativeEvent.actionName === 'increment' ? 5 : -5)),
    );
    committed.set(v);
    progress.set(withSpring(v / 100, spring('snappy', reduced)));
    onValueChange?.(v);
    onSlidingComplete?.(v);
  };

  const lit = Math.round((now / 100) * (ticks - 1));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: space[4],
          gap: space[3],
          boxShadow: shadow.md,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium }}>
        {label}
      </Text>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now, text: `${now}%` }}
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => width.set(e.nativeEvent.layout.width)}
          style={styles.hit}
        >
          <View
            style={[
              styles.track,
              { backgroundColor: colors.surfaceSunken, borderRadius: radius.xs },
            ]}
          >
            <Animated.View
              style={[
                styles.fill,
                { borderRadius: radius.xs },
                gradient(
                  `linear-gradient(90deg, ${withAlpha(fillColor, 0.35)} 0%, ${withAlpha(fillColor, 0.85)} 100%)`,
                ),
                fill,
              ]}
            />
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.handle, { backgroundColor: colors.azure }, handle]}
          />
        </View>
      </GestureDetector>
      <View style={[styles.ruler, { gap: space[2] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{lowLabel}</Text>
        <View style={styles.ticks}>
          {Array.from({ length: ticks }, (_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                { backgroundColor: i <= lit && now > 0 ? colors.textMuted : colors.track },
              ]}
            />
          ))}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{highLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  hit: { height: minTouchTarget, justifyContent: 'center' },
  track: { height: TRACK, overflow: 'hidden' },
  fill: { height: '100%' },
  handle: { position: 'absolute', left: 0, width: 4, height: 16, borderRadius: 2 },
  ruler: { flexDirection: 'row', alignItems: 'center' },
  ticks: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  tick: { width: 1.5, height: 10, borderRadius: 1 },
});
