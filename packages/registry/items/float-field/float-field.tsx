import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type FloatFieldProps = Omit<
  TextInputProps,
  'style' | 'placeholder' | 'value' | 'onChangeText' | 'multiline'
> & {
  /** Sits inside the empty field and floats up to the top edge once it has focus or text. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Shown in red under the field; the field shakes once each time a new error appears. */
  error?: string;
  /** Helper text under the field, replaced by the error while there is one. */
  hint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 56;
const LINE = 22;
/** How far the label rises: from the middle of the field to its top padding. */
const RISE = HEIGHT / 2 - 15;
const SMALL = 0.78;

/**
 * A text field whose label lives inside it. On focus the label rises and
 * shrinks to the top edge while a ring fades in around the field; an error
 * turns the ring red, shakes the field once and slides its message in below.
 */
export function FloatField({
  label,
  value,
  onChangeText,
  error,
  hint,
  editable = true,
  onFocus,
  onBlur,
  testID,
  style,
  ...input
}: FloatFieldProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  const invalid = Boolean(error);

  const lift = useSharedValue(floated ? 1 : 0);
  const ring = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    lift.set(withSpring(floated ? 1 : 0, spring('snappy', reduced)));
  }, [floated, reduced, lift]);
  useEffect(() => {
    ring.set(withTiming(focused ? 1 : 0, timing('quick', reduced)));
  }, [focused, reduced, ring]);
  useEffect(() => {
    if (!error) return;
    AccessibilityInfo.announceForAccessibility(error);
    if (reduced) return;
    const step = { duration: 45, easing: easings.inOut };
    shake.set(
      withSequence(
        withTiming(-6, step),
        withTiming(6, step),
        withTiming(-4, step),
        withTiming(3, step),
        withSpring(0, spring('snappy')),
      ),
    );
  }, [error, reduced, shake]);

  const accent = invalid ? colors.danger : colors.azure;

  const shell = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const outline = useAnimatedStyle(() => ({ opacity: invalid ? 1 : ring.get() }));
  const labelMotion = useAnimatedStyle(() => {
    const p = lift.get();
    return {
      color: interpolateColor(
        ring.get(),
        [0, 1],
        [invalid ? colors.danger : colors.textMuted, accent],
      ),
      transform: [{ translateY: -RISE * p }, { scale: 1 - (1 - SMALL) * p }],
    };
  });

  const message = error ?? hint;

  return (
    <View testID={testID} style={[{ gap: space[1.5], opacity: editable ? 1 : 0.5 }, style]}>
      <Animated.View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            borderRadius: radius.md,
          },
          shell,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderColor: accent, borderRadius: radius.md + 1 }, outline]}
        />
        <Animated.Text
          pointerEvents="none"
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[
            styles.label,
            { left: space[4], right: space[4], fontSize: font.size.md, lineHeight: LINE },
            labelMotion,
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          {...input}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={message}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          selectionColor={accent}
          cursorColor={accent}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: font.size.md,
              paddingHorizontal: space[4],
            },
          ]}
        />
      </Animated.View>
      {message ? (
        <Message
          key={message}
          text={message}
          color={invalid ? colors.danger : colors.textSubtle}
          size={font.size.xs}
          indent={space[4]}
          reduced={reduced}
        />
      ) : null}
    </View>
  );
}

type MessageProps = { text: string; color: string; size: number; indent: number; reduced: boolean };

/** Each new message drops in from just above its place. */
function Message({ text, color, size, indent, reduced }: MessageProps) {
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.set(withTiming(1, { duration: durations.base, easing: easings.standard }));
  }, [shown]);
  const motion = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * -4 }],
  }));
  return (
    <Animated.Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ color, fontSize: size, paddingHorizontal: indent }, motion]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  field: { height: HEIGHT, borderWidth: 1, justifyContent: 'center' },
  ring: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2 },
  label: {
    position: 'absolute',
    top: (HEIGHT - LINE) / 2 - 1,
    transformOrigin: 'left center',
  },
  input: { height: HEIGHT - 2, paddingTop: 20, paddingBottom: 4 },
});
