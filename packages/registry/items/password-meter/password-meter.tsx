import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
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
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type PasswordRule = { label: string; test: (password: string) => boolean };

export const defaultPasswordRules: readonly PasswordRule[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Upper and lower case', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Strength from 0 to 4: the share of rules a password meets, scaled to the four segments. */
export function passwordStrength(
  password: string,
  rules: readonly PasswordRule[] = defaultPasswordRules,
): number {
  if (!password || rules.length === 0) return 0;
  const met = rules.filter((r) => r.test(password)).length;
  return Math.round((met / rules.length) * 4);
}

const WORDS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export type PasswordMeterProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** Shown above the field and names it. Defaults to 'Password'. */
  label?: string;
  placeholder?: string;
  /** What a strong password needs. Defaults to length, mixed case, a number and a symbol. */
  rules?: readonly PasswordRule[];
  /** List the rules under the meter, each ticking off as it is met. Defaults to true. */
  showRules?: boolean;
  /** Passed to the text input, e.g. `onSubmitEditing` or `returnKeyType`. */
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'secureTextEntry' | 'style'>;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A new-password field with a strength meter. Four segments fill one after
 * another as the password gets stronger, the colour warms from red to green,
 * and each rule below ticks off the moment it is met.
 */
export function PasswordMeter({
  value,
  onChangeText,
  label = 'Password',
  placeholder,
  rules = defaultPasswordRules,
  showRules = true,
  inputProps,
  testID,
  style,
}: PasswordMeterProps) {
  const { colors, font, space, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const score = passwordStrength(value, rules);
  const word = value ? WORDS[score] : '';

  const level = useSharedValue(score);
  const focus = useSharedValue(0);
  useEffect(() => {
    level.set(withSpring(score, spring('smooth', reduced)));
  }, [score, reduced, level]);
  useEffect(() => {
    focus.set(withSpring(focused ? 1 : 0, spring('snappy', reduced)));
  }, [focused, reduced, focus]);

  // Speak the strength when it changes, not on every keystroke.
  const spoken = useRef('');
  useEffect(() => {
    if (!word || word === spoken.current) return;
    spoken.current = word;
    AccessibilityInfo.announceForAccessibility(`Password strength: ${word}`);
  }, [word]);

  const ramp = [colors.danger, colors.danger, colors.warning, colors.azure, colors.success];
  const field = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [colors.border, colors.azure]),
  }));

  return (
    <View testID={testID} style={[{ gap: space[2] }, style]}>
      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderRadius: radius.md, paddingLeft: space[4] },
          field,
        ]}
      >
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          onFocus={(e) => {
            setFocused(true);
            inputProps?.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps?.onBlur?.(e);
          }}
          accessibilityLabel={label}
          selectionColor={colors.azure}
          style={[styles.input, { color: colors.text, fontSize: font.size.md }]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={({ pressed }) => [
            styles.reveal,
            { paddingHorizontal: space[4], opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text
            style={{
              color: colors.azure,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            {visible ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </Animated.View>

      <View style={styles.meterRow}>
        <View style={[styles.meter, { gap: 4 }]}>
          {[0, 1, 2, 3].map((i) => (
            <Segment
              key={i}
              index={i}
              level={level}
              ramp={ramp}
              track={colors.track}
              radius={radius.pill}
            />
          ))}
        </View>
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.word,
            {
              color: value ? ramp[score] : colors.textSubtle,
              fontSize: font.size.xs,
              fontWeight: font.weight.semibold,
            },
          ]}
        >
          {word}
        </Text>
      </View>

      {showRules ? (
        <View style={{ gap: 6, marginTop: space[1] }}>
          {rules.map((rule) => (
            <Rule key={rule.label} label={rule.label} met={rule.test(value)} reduced={reduced} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Segment({
  index,
  level,
  ramp,
  track,
  radius,
}: {
  index: number;
  level: SharedValue<number>;
  ramp: string[];
  track: string;
  radius: number;
}) {
  const fill = useAnimatedStyle(() => {
    const l = level.get();
    return {
      width: `${Math.max(0, Math.min(1, l - index)) * 100}%`,
      // The whole meter shares one colour, set by the overall strength.
      backgroundColor: interpolateColor(l, [0, 1, 2, 3, 4], ramp),
    };
  });
  return (
    <View style={[styles.segment, { backgroundColor: track, borderRadius: radius }]}>
      <Animated.View style={[styles.segmentFill, { borderRadius: radius }, fill]} />
    </View>
  );
}

function Rule({ label, met, reduced }: { label: string; met: boolean; reduced: boolean }) {
  const { colors, font } = useKinetikTheme();
  const on = useSharedValue(met ? 1 : 0);
  useEffect(() => {
    on.set(withSpring(met ? 1 : 0, spring('bouncy', reduced)));
  }, [met, reduced, on]);

  const dot = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], [colors.track, colors.success]),
    transform: [{ scale: 1 + Math.sin(Math.max(0, Math.min(1, on.get())) * Math.PI) * 0.25 }],
  }));
  const tick = useAnimatedStyle(() => ({
    opacity: on.get(),
    transform: [{ rotate: '45deg' }, { scale: Math.max(0, on.get()) }],
  }));
  const text = useAnimatedStyle(() => ({
    color: interpolateColor(on.get(), [0, 1], [colors.textMuted, colors.text]),
  }));

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${met ? 'met' : 'not met'}`}
      style={styles.rule}
    >
      <Animated.View style={[styles.dot, dot]}>
        <Animated.View style={[styles.tick, { borderColor: colors.onEmber }, tick]} />
      </Animated.View>
      <Animated.Text style={[{ fontSize: font.size.sm }, text]}>{label}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 52,
  },
  input: { flex: 1, paddingVertical: 12 },
  reveal: { minHeight: minTouchTarget, justifyContent: 'center' },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meter: { flex: 1, flexDirection: 'row' },
  segment: { flex: 1, height: 4, overflow: 'hidden' },
  segmentFill: { height: '100%' },
  word: { minWidth: 64, textAlign: 'right' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 4, height: 8, marginTop: -2, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
});
