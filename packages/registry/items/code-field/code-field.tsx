import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import type { Palette } from '../../shared/tokens/tokens';

export type CodeFieldStatus = 'idle' | 'error' | 'success';

export type CodeFieldProps = {
  value: string;
  /** Called with digits only, never longer than `length`. */
  onChangeText: (value: string) => void;
  /** Called once when the last digit is entered. */
  onComplete?: (code: string) => void;
  /** Number of digits. Defaults to 6. */
  length?: number;
  /** `error` shakes the row and tints it red; `success` sends a wave along it. Defaults to `idle`. */
  status?: CodeFieldStatus;
  /** Names the field for screen readers. Defaults to 'Verification code'. */
  accessibilityLabel?: string;
  /** Show dots instead of digits. Defaults to false. */
  secure?: boolean;
  autoFocus?: boolean;
  /** Haptics on error and success. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const CELL_H = 56;
const GAP = 8;

/**
 * A one-time-code field drawn as a row of cells. Digits pop into place, a
 * caret glides to the next cell, a wrong code shakes the row and a right one
 * sends a ripple along it. One real text input sits on top, so paste, SMS
 * autofill and the system keyboard all work as usual.
 */
export function CodeField({
  value,
  onChangeText,
  onComplete,
  length = 6,
  status = 'idle',
  accessibilityLabel = 'Verification code',
  secure = false,
  autoFocus = false,
  haptics = true,
  disabled = false,
  testID,
  style,
}: CodeFieldProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [width, setWidth] = useState(0);
  const digits = value.replace(/\D/g, '').slice(0, length);
  const active = Math.min(digits.length, length - 1);
  const cellW = width > 0 ? (width - GAP * (length - 1)) / length : 0;

  const shake = useSharedValue(0);
  const wave = useSharedValue(0);
  const caretX = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (status === 'error') {
      haptic('error');
      AccessibilityInfo.announceForAccessibility('Code not accepted');
      if (!reduced) {
        shake.set(
          withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(9, { duration: 70 }),
            withTiming(-6, { duration: 70 }),
            withTiming(4, { duration: 70 }),
            withSpring(0, spring('snappy')),
          ),
        );
      }
    }
    if (status === 'success') {
      haptic('success');
      AccessibilityInfo.announceForAccessibility('Code accepted');
      wave.set(0);
      if (!reduced) wave.set(withTiming(1, { duration: 700, easing: easings.standard }));
    }
  }, [status, reduced, haptic, shake, wave]);

  useEffect(() => {
    const x = active * (cellW + GAP);
    caretX.set(reduced ? x : withSpring(x, spring('snappy')));
  }, [active, cellW, reduced, caretX]);

  // The caret blinks only while the field has focus and is still waiting for digits.
  const waiting = focused && digits.length < length && status !== 'success';
  useEffect(() => {
    if (!waiting || reduced) {
      blink.set(1);
      return;
    }
    blink.set(
      withRepeat(
        withSequence(
          withDelay(450, withTiming(0, { duration: 120 })),
          withDelay(300, withTiming(1, { duration: 120 })),
        ),
        -1,
      ),
    );
  }, [waiting, reduced, blink]);

  const change = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, length);
    if (next === digits) return;
    onChangeText(next);
    if (next.length === length) onComplete?.(next);
  };

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const caret = useAnimatedStyle(() => ({
    opacity: waiting ? blink.get() : 0,
    transform: [{ translateX: caretX.get() + cellW / 2 - 1 }],
  }));

  const tone =
    status === 'error' ? colors.danger : status === 'success' ? colors.success : colors.azure;

  return (
    <View
      testID={testID}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.row, { gap: GAP }, row]} pointerEvents="none">
        {Array.from({ length }, (_, i) => (
          <Cell
            key={i}
            char={digits[i]}
            secure={secure}
            index={i}
            count={length}
            current={focused && i === active && status === 'idle'}
            tone={tone}
            status={status}
            wave={wave}
            reduced={reduced}
            colors={colors}
            radius={radius.md}
            fontSize={font.size['2xl']}
            fontWeight={font.weight.semibold}
          />
        ))}
        {cellW > 0 ? (
          <Animated.View style={[styles.caret, { backgroundColor: colors.azure }, caret]} />
        ) : null}
      </Animated.View>
      <TextInput
        ref={input}
        value={digits}
        onChangeText={change}
        editable={!disabled}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        caretHidden
        contextMenuHidden={false}
        selectionColor="transparent"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`${length} digits`}
        accessibilityState={{ disabled }}
        style={[StyleSheet.absoluteFill, styles.input]}
      />
    </View>
  );
}

type CellProps = {
  char: string | undefined;
  secure: boolean;
  index: number;
  count: number;
  current: boolean;
  tone: string;
  status: CodeFieldStatus;
  wave: SharedValue<number>;
  reduced: boolean;
  colors: Palette;
  radius: number;
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
};

function Cell({
  char,
  secure,
  index,
  count,
  current,
  tone,
  status,
  wave,
  reduced,
  colors,
  radius,
  fontSize,
  fontWeight,
}: CellProps) {
  const pop = useSharedValue(char ? 1 : 0);
  const ring = useSharedValue(current ? 1 : 0);
  const filled = char !== undefined;

  useEffect(() => {
    if (!filled) {
      pop.set(withTiming(0, { duration: durations.quick }));
      return;
    }
    pop.set(0);
    pop.set(reduced ? 1 : withSpring(1, spring('bouncy')));
  }, [char, filled, reduced, pop]);

  useEffect(() => {
    ring.set(withSpring(current || status !== 'idle' ? 1 : 0, spring('snappy', reduced)));
  }, [current, status, reduced, ring]);

  const cell = useAnimatedStyle(() => {
    // Each cell lifts as the success wave passes over it.
    const at = wave.get() * (count + 2) - index - 1;
    const lift = at > 0 && at < 2 ? Math.sin((at / 2) * Math.PI) : 0;
    return {
      borderColor: interpolateColor(ring.get(), [0, 1], [colors.border, tone]),
      backgroundColor: filled ? colors.surfaceRaised : colors.surface,
      transform: [{ translateY: -lift * 6 }],
    };
  });
  const glyph = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.get() * 1.4),
    transform: [{ translateY: (1 - pop.get()) * 10 }, { scale: 0.6 + pop.get() * 0.4 }],
  }));

  return (
    <Animated.View style={[styles.cell, { borderRadius: radius }, cell]}>
      <Animated.View style={glyph}>
        {secure && filled ? (
          <View style={[styles.dot, { backgroundColor: colors.text }]} />
        ) : (
          <Text
            style={{
              color: status === 'error' ? colors.danger : colors.text,
              fontSize,
              fontWeight,
              fontVariant: ['tabular-nums'],
            }}
          >
            {char ?? ''}
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: {
    flex: 1,
    height: CELL_H,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: {
    position: 'absolute',
    left: 0,
    top: CELL_H / 2 - 12,
    width: 2,
    height: 24,
    borderRadius: 1,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  // The real input covers the row so taps, long-press paste and autofill land on it.
  input: { opacity: 0.02, color: 'transparent', fontSize: 1 },
});
