import { useEffect, useRef } from 'react';
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
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type PulseToggleSize = 'sm' | 'md';

export type PulseToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Visible label. Tapping it toggles too. Also used as the accessibility label. */
  label?: string;
  /** Accessibility label when there is no visible label. */
  accessibilityLabel?: string;
  /** Secondary line under the label. */
  description?: string;
  disabled?: boolean;
  /** Track colour when on. Defaults to the theme ember. */
  activeColor?: string;
  /** Defaults to `md`. */
  size?: PulseToggleSize;
  /** Plays a light tap when toggled. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const DIM: Record<PulseToggleSize, { w: number; h: number; thumb: number }> = {
  sm: { w: 44, h: 26, thumb: 18 },
  md: { w: 54, h: 32, thumb: 24 },
};

/**
 * A switch whose thumb changes shape as it travels: a circle stretches into a
 * pill mid-flight and lands as a rounded square, releasing a pulse ring when it
 * turns on.
 */
export function PulseToggle({
  value,
  onValueChange,
  label,
  accessibilityLabel,
  description,
  disabled = false,
  activeColor,
  size = 'md',
  haptics = true,
  style,
}: PulseToggleProps) {
  const { colors, font, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const on = activeColor ?? colors.ember;
  const { w, h, thumb } = DIM[size];
  const pad = (h - thumb) / 2;
  const inner = w - pad * 2;

  const progress = useSharedValue(value ? 1 : 0);
  const pressed = useSharedValue(0);
  const ring = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    progress.set(
      reduced
        ? withTiming(value ? 1 : 0, timing('quick'))
        : withSpring(value ? 1 : 0, spring('snappy')),
    );
    if (first.current) {
      first.current = false;
      return;
    }
    if (value && !reduced) {
      ring.set(0);
      ring.set(withTiming(1, timing('slow')));
    }
  }, [value, reduced, progress, ring]);

  const toggle = () => {
    haptic('tap');
    onValueChange(!value);
  };

  const tap = Gesture.Tap()
    .withTestId('pulse-toggle')
    .enabled(!disabled)
    .maxDuration(60_000)
    .onBegin(() => {
      pressed.set(withSpring(1, spring('snappy', reduced)));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, spring('snappy', reduced)));
    })
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(toggle);
    });

  const onClear = withAlpha(on, 0);
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.track, on]),
    borderColor: interpolateColor(progress.get(), [0, 1], [colors.borderStrong, onClear]),
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const p = progress.get();
    // Stretch peaks mid-travel; pressing adds a little extra width.
    const stretch = reduced ? 0 : Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * 0.55;
    const width = thumb * (1 + stretch + pressed.get() * 0.18);
    const x = pad + p * (inner - width);
    return {
      width,
      transform: [{ translateX: x }],
      borderRadius: interpolate(p, [0, 1], [thumb / 2, thumb * 0.3], 'clamp'),
      backgroundColor: interpolateColor(p, [0, 1], [colors.textMuted, colors.highlight]),
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const t = ring.get();
    return {
      opacity: t === 0 ? 0 : (1 - t) * 0.55,
      transform: [{ scale: 1 + t * 0.9 }],
    };
  });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && !disabled) toggle();
  };

  const control = (
    <View style={{ width: w, height: h }}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderRadius: h / 2, borderColor: on }, ringStyle]}
      />
      <Animated.View style={[styles.track, { width: w, height: h, borderRadius: h / 2 }, track]}>
        <Animated.View
          style={[
            styles.thumb,
            { height: thumb, top: pad - StyleSheet.hairlineWidth, boxShadow: shadow.sm },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </View>
  );

  return (
    <GestureDetector gesture={tap}>
      <View
        collapsable={false}
        accessible
        accessibilityRole="switch"
        accessibilityLabel={label ?? accessibilityLabel}
        accessibilityHint={description}
        accessibilityState={{ checked: value, disabled }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onAccessibilityAction}
        hitSlop={label ? undefined : { top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.row,
          { minHeight: minTouchTarget, gap: space[4], opacity: disabled ? 0.45 : 1 },
          label ? styles.stretch : null,
          style,
        ]}
      >
        {label ? (
          <View style={styles.labels}>
            <Text
              style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium }}
            >
              {label}
            </Text>
            {description ? (
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 }}>
                {description}
              </Text>
            ) : null}
          </View>
        ) : null}
        {control}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  stretch: { alignSelf: 'stretch' },
  labels: { flex: 1 },
  track: { borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  thumb: { position: 'absolute', left: 0 },
  ring: { ...StyleSheet.absoluteFill, borderWidth: 2 },
});
