import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type RotationRulerProps = {
  /** Angle in degrees. */
  value: number;
  /** Called on each whole degree while dragging and as it settles. */
  onValueChange?: (value: number) => void;
  /** Called once the ruler comes to rest. */
  onSlidingComplete?: (value: number) => void;
  /** Defaults to -45. */
  min?: number;
  /** Defaults to 45. */
  max?: number;
  /** Space between degree ticks, in pt. Defaults to 8. */
  spacing?: number;
  /** Accessible name. Defaults to "Rotation". */
  label?: string;
  disabled?: boolean;
  /** A tick on every degree and a firmer one at zero. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A straighten dial like a photo editor's: a ruler of degree ticks that
 * slides under a fixed marker. Flick it and it glides to a stop, snapping to
 * zero when it comes to rest close by. Double-tap to level it.
 */
export function RotationRuler({
  value,
  onValueChange,
  onSlidingComplete,
  min = -45,
  max = 45,
  spacing = 8,
  label = 'Rotation',
  disabled = false,
  haptics = true,
  style,
}: RotationRulerProps) {
  const { colors, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const count = Math.round(max - min) + 1;

  const width = useSharedValue(0);
  const angle = useSharedValue(value);
  const start = useSharedValue(value);
  const committed = useSharedValue(Math.round(value));
  const dragging = useSharedValue(false);
  const [shown, setShown] = useState<number | null>(null);
  const now = shown ?? value;

  useEffect(() => {
    if (dragging.get()) return;
    const v = Math.min(max, Math.max(min, value));
    angle.set(reduced ? v : withSpring(v, spring('smooth')));
    committed.set(Math.round(v));
  }, [value, min, max, reduced, angle, committed, dragging]);

  const emit = (v: number) => {
    setShown(v);
    onValueChange?.(v);
    haptic(v === 0 ? 'tap' : 'tick');
  };
  const complete = (v: number) => {
    setShown(null);
    onSlidingComplete?.(v);
  };

  const track = (a: number) => {
    'worklet';
    const v = Math.round(a);
    if (v !== committed.get()) {
      committed.set(v);
      scheduleOnRN(emit, v);
    }
  };

  const settle = (target: number) => {
    'worklet';
    // Rest on a whole degree; within two degrees of level, rest on zero.
    let to = Math.round(Math.max(min, Math.min(max, target)));
    if (Math.abs(to) <= 2 && min <= 0 && max >= 0) to = 0;
    angle.set(withSpring(to, spring('smooth', reduced)));
    track(to);
    scheduleOnRN(complete, to);
  };

  const pan = Gesture.Pan()
    .withTestId('rotation-ruler')
    .enabled(!disabled)
    .activeOffsetX([-3, 3])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragging.set(true);
      start.set(angle.get());
    })
    .onUpdate((e) => {
      const a = Math.max(min, Math.min(max, start.get() - e.translationX / spacing));
      angle.set(a);
      track(a);
    })
    .onEnd((e) => {
      dragging.set(false);
      // Carry a little of the flick before settling.
      settle(angle.get() - (reduced ? 0 : (e.velocityX / spacing) * 0.12));
    });

  const level = Gesture.Tap()
    .withTestId('rotation-ruler-reset')
    .numberOfTaps(2)
    // A finger that moves is dragging, not tapping: fail at once so the pan takes over.
    .maxDistance(10)
    .enabled(!disabled)
    .onEnd(() => settle(0));

  const strip = useAnimatedStyle(() => ({
    transform: [{ translateX: width.get() / 2 - (angle.get() - min + 0.5) * spacing }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const next = committed.get() + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    const v = Math.max(min, Math.min(max, next));
    committed.set(v);
    angle.set(withSpring(v, spring('snappy', reduced)));
    onValueChange?.(v);
    onSlidingComplete?.(v);
  };

  const fade = withAlpha(colors.surfaceRaised, 0);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <GestureDetector gesture={Gesture.Race(pan, level)}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityHint="Drag to straighten"
          accessibilityValue={{ min, max, now, text: `${now} degrees` }}
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => width.set(e.nativeEvent.layout.width)}
          style={[styles.hit, { borderRadius: radius.lg }]}
        >
          <Animated.View style={[styles.strip, strip]} pointerEvents="none">
            {Array.from({ length: count }, (_, i) => (
              <Tick key={i} degree={min + i} spacing={spacing} />
            ))}
          </Animated.View>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              gradient(
                `linear-gradient(90deg, ${colors.surfaceRaised} 0%, ${fade} 30%, ${fade} 70%, ${colors.surfaceRaised} 100%)`,
              ),
            ]}
          />
          <View pointerEvents="none" style={styles.marker}>
            <View style={[styles.dot, { backgroundColor: colors.azure }]} />
            <View style={[styles.needle, { backgroundColor: colors.text }]} />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

/** One degree mark; every fifth is taller. The fade at the edges does the rest. */
function Tick({ degree, spacing }: { degree: number; spacing: number }) {
  const { colors } = useKinetikTheme();
  const major = degree % 5 === 0;
  return (
    <View style={[styles.tickSlot, { width: spacing }]}>
      <View
        style={[
          styles.tick,
          {
            height: major ? 16 : 9,
            backgroundColor: major ? colors.text : colors.textSubtle,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 56, justifyContent: 'center', overflow: 'hidden' },
  hit: { height: 56, justifyContent: 'center', overflow: 'hidden', minHeight: minTouchTarget },
  strip: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center', height: 56 },
  tickSlot: { alignItems: 'center', justifyContent: 'center' },
  tick: { width: 1.5, borderRadius: 1 },
  marker: {
    position: 'absolute',
    left: '50%',
    top: 8,
    bottom: 8,
    width: 6,
    marginLeft: -3,
    alignItems: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 2, marginBottom: 3 },
  needle: { width: 2, flex: 1, borderRadius: 1 },
});
