import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type CopyChipProps = {
  /** The text to show and copy, e.g. a command, a link or a code. */
  value: string;
  /** Does the copying, e.g. `(v) => Clipboard.setStringAsync(v)` from expo-clipboard. */
  onCopy: (value: string) => void | Promise<unknown>;
  /** A short name read before the value, e.g. "Install command". */
  label?: string;
  /** Show the value in a monospaced face. Defaults to true. */
  monospace?: boolean;
  /** How long the copied state lasts, in ms. Defaults to 1600. */
  resetAfter?: number;
  /** A success haptic on copy. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * A value with a copy button. Press it and the two pages of the copy glyph
 * fold into a check while a ring spreads from it and the outline turns
 * green, then it all eases back.
 */
export function CopyChip({
  value,
  onCopy,
  label,
  monospace = true,
  resetAfter = 1600,
  haptics = true,
  testID,
  style,
}: CopyChipProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [copied, setCopied] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const done = useSharedValue(0);
  const ring = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    done.set(withSpring(copied ? 1 : 0, spring(copied ? 'bouncy' : 'smooth', reduced)));
    if (!copied) return;
    ring.set(0);
    if (!reduced) ring.set(withTiming(1, { duration: durations.slow, easing: easings.standard }));
    const id = setTimeout(() => setCopied(false), resetAfter);
    return () => clearTimeout(id);
  }, [copied, reduced, resetAfter, done, ring]);

  const copy = async () => {
    try {
      await onCopy(value);
    } catch {
      haptic('error');
      return;
    }
    if (!mounted.current) return;
    haptic('success');
    setCopied(true);
    AccessibilityInfo.announceForAccessibility('Copied');
  };

  const shell = useAnimatedStyle(() => ({
    borderColor: interpolateColor(done.get(), [0, 1], [colors.border, colors.success]),
    transform: [{ scale: 1 - press.get() * 0.03 }],
  }));
  const pages = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, done.get() * 1.6),
    transform: [
      { scale: 1 - Math.min(1, Math.max(0, done.get())) * 0.5 },
      { rotate: `${done.get() * -20}deg` },
    ],
  }));
  const check = useAnimatedStyle(() => ({
    opacity: Math.max(0, done.get() * 1.6 - 0.6),
    transform: [{ rotate: '45deg' }, { scale: 0.4 + Math.max(0, done.get()) * 0.6 }],
  }));
  const ripple = useAnimatedStyle(() => ({
    opacity: (1 - ring.get()) * 0.35 * (ring.get() > 0 ? 1 : 0),
    transform: [{ scale: 0.6 + ring.get() * 1.1 }],
  }));

  return (
    <Pressable
      testID={testID}
      onPress={copy}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label ? `${label}: ` : ''}${value}`}
      accessibilityValue={copied ? { text: 'Copied' } : undefined}
      style={style}
    >
      <Animated.View
        style={[
          styles.shell,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingLeft: space[4],
            gap: space[2],
          },
          shell,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            {
              color: colors.text,
              fontSize: font.size.sm,
              fontFamily: monospace ? mono : undefined,
            },
          ]}
        >
          {value}
        </Text>
        <View style={styles.button}>
          <Animated.View style={[styles.ring, { borderColor: colors.success }, ripple]} />
          <Animated.View style={[styles.glyph, pages]}>
            <View style={[styles.page, styles.back, { borderColor: colors.textMuted }]} />
            <View
              style={[
                styles.page,
                styles.front,
                { borderColor: colors.text, backgroundColor: colors.surface },
              ]}
            />
          </Animated.View>
          <Animated.View style={[styles.check, { borderColor: colors.success }, check]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: minTouchTarget + 4,
  },
  value: { flex: 1 },
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  glyph: { width: 18, height: 18 },
  // Two pages: the back one peeks out above and to the left of the front one.
  page: { position: 'absolute', width: 12, height: 13, borderRadius: 3, borderWidth: 1.6 },
  back: { left: 0, top: 0 },
  front: { left: 5, top: 5 },
  check: {
    position: 'absolute',
    width: 7,
    height: 13,
    marginTop: -3,
    borderBottomWidth: 2.2,
    borderRightWidth: 2.2,
  },
});
