import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type MoneyFieldProps = {
  /** The amount in minor units: cents for dollars, pence for pounds. */
  value: number;
  onChangeValue: (minor: number) => void;
  /** Names the field for screen readers, e.g. "Amount to send". */
  label: string;
  /** Written before the amount. Defaults to "$". */
  currency?: string;
  /** Digits after the decimal separator. Defaults to 2. */
  fractionDigits?: number;
  /** Defaults to ",". */
  groupSeparator?: string;
  /** Defaults to ".". */
  decimalSeparator?: string;
  /** Largest amount in minor units. Defaults to 99,999,999 (999,999.99). */
  max?: number;
  /** A tick per typed digit. Defaults to true. */
  haptics?: boolean;
  /** Style for the amount; the cell widths are measured from it. */
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Kind = 'digit' | 'group' | 'decimal';
type Glyph = { ch: string; kind: Kind; fraction: boolean };

/** Formats minor units into glyphs, without the currency sign. */
export function formatMinor(
  minor: number,
  fractionDigits = 2,
  groupSeparator = ',',
  decimalSeparator = '.',
): Glyph[] {
  const digits = String(Math.max(0, Math.floor(minor))).padStart(fractionDigits + 1, '0');
  const whole = digits.slice(0, digits.length - fractionDigits);
  const fraction = fractionDigits > 0 ? digits.slice(-fractionDigits) : '';
  const out: Glyph[] = [];
  for (let i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 === 0) {
      out.push({ ch: groupSeparator, kind: 'group', fraction: false });
    }
    out.push({ ch: whole[i]!, kind: 'digit', fraction: false });
  }
  if (fraction) {
    out.push({ ch: decimalSeparator, kind: 'decimal', fraction: true });
    for (const ch of fraction) out.push({ ch, kind: 'digit', fraction: true });
  }
  return out;
}

type Widths = Record<Kind | 'sign', number>;

/**
 * A currency field typed like a till: digits come in from the right, every
 * place rolls to its new digit, separators slide in as the amount grows, and
 * a caret blinks at the end. The value is kept in minor units, so there is
 * no floating-point rounding.
 */
export function MoneyField({
  value,
  onChangeValue,
  label,
  currency = '$',
  fractionDigits = 2,
  groupSeparator = ',',
  decimalSeparator = '.',
  max = 99_999_999,
  haptics = true,
  textStyle,
  testID,
  style,
}: MoneyFieldProps) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [focused, setFocused] = useState(false);

  const amount = StyleSheet.flatten([
    {
      color: colors.text,
      fontSize: font.size['4xl'],
      fontWeight: font.weight.semibold,
      letterSpacing: font.tracking.tight,
    },
    textStyle,
  ]);
  const size = amount.fontSize ?? font.size['4xl'];
  const lineHeight = Math.round(size * 1.2);
  const styleKey = JSON.stringify(amount);

  const [widths, setWidths] = useState<{ key: string; w: Partial<Widths> }>({
    key: styleKey,
    w: {},
  });
  if (widths.key !== styleKey) setWidths({ key: styleKey, w: {} });
  const measured =
    widths.w.digit !== undefined &&
    widths.w.group !== undefined &&
    widths.w.decimal !== undefined &&
    widths.w.sign !== undefined;

  const glyphs = formatMinor(value, fractionDigits, groupSeparator, decimalSeparator);
  const text = currency + glyphs.map((g) => g.ch).join('');

  // Places are keyed from the right, so typing a digit rolls every place instead of
  // inserting one. Places that drop off the left leave with a short exit.
  const [state, setState] = useState({
    value,
    glyphs,
    leaving: [] as Glyph[],
    dir: 1,
    batch: 0,
  });
  if (state.value !== value) {
    const lost = state.glyphs.length - glyphs.length;
    setState({
      value,
      glyphs,
      leaving: lost > 0 && !reduced ? state.glyphs.slice(0, lost) : [],
      dir: value >= state.value ? 1 : -1,
      batch: state.batch + 1,
    });
  }
  const { batch } = state;
  const leavingCount = state.leaving.length;
  useEffect(() => {
    if (leavingCount === 0) return;
    const id = setTimeout(
      () => setState((s) => (s.batch === batch ? { ...s, leaving: [] } : s)),
      durations.base,
    );
    return () => clearTimeout(id);
  }, [batch, leavingCount]);

  const change = (typed: string) => {
    const digits = typed.replace(/\D/g, '').replace(/^0+/, '');
    const next = digits.length === 0 ? 0 : Number(digits);
    if (!Number.isFinite(next) || next > max) {
      haptic('warning');
      return;
    }
    if (next !== value) {
      haptic('tick');
      onChangeValue(next);
    }
  };

  const caret = useSharedValue(0);
  useEffect(() => {
    if (!focused) {
      cancelAnimation(caret);
      caret.set(0);
      return;
    }
    caret.set(1);
    if (reduced) return;
    caret.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 180, easing: easings.inOut }),
          withTiming(0, { duration: 320 }),
          withTiming(1, { duration: 180, easing: easings.inOut }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(caret);
  }, [focused, reduced, caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.get() }));

  const measure =
    (kind: keyof Widths) =>
    (w: number): void =>
      setWidths((m) =>
        m.key !== styleKey || m.w[kind] !== undefined ? m : { ...m, w: { ...m.w, [kind]: w } },
      );

  const widthOf = (g: Glyph) => (measured ? widths.w[g.kind] : undefined);
  const colorOf = (g: Glyph) => (g.fraction ? colors.textMuted : amount.color);

  return (
    <View testID={testID} style={[{ gap: space[1] }, style]}>
      {!measured ? (
        <View
          style={styles.measure}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          {(
            [
              ['digit', '0'],
              ['group', groupSeparator],
              ['decimal', decimalSeparator],
              ['sign', currency],
            ] as const
          ).map(([kind, ch]) => (
            <Text
              key={kind}
              style={[amount, styles.tabular]}
              onLayout={(e) => measure(kind)(e.nativeEvent.layout.width)}
            >
              {ch}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.frame}>
        <View
          style={[styles.amount, { height: lineHeight + space[2] }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[amount, styles.tabular, { color: colors.textMuted, lineHeight }]}>
            {currency}
          </Text>
          {state.leaving.map((g, i) => (
            <Cell
              key={`out-${state.batch}-${i}`}
              glyph={g}
              width={widthOf(g)}
              height={lineHeight}
              style={amount}
              color={colorOf(g)}
              dir={state.dir}
              phase="leave"
              reduced={reduced}
            />
          ))}
          {glyphs.map((g, i) => (
            <Cell
              key={`p${glyphs.length - 1 - i}`}
              glyph={g}
              width={widthOf(g)}
              height={lineHeight}
              style={amount}
              color={colorOf(g)}
              dir={state.dir}
              phase="stay"
              reduced={reduced}
            />
          ))}
          <Animated.View
            style={[
              styles.caret,
              { height: Math.round(size * 0.9), backgroundColor: colors.azure },
              caretStyle,
            ]}
          />
        </View>
        <TextInput
          value={value === 0 ? '' : String(value)}
          onChangeText={change}
          keyboardType="number-pad"
          caretHidden
          contextMenuHidden
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityValue={{ text }}
          style={styles.input}
        />
      </View>
    </View>
  );
}

type CellProps = {
  glyph: Glyph;
  width: number | undefined;
  height: number;
  style: TextStyle;
  color: TextStyle['color'];
  dir: number;
  phase: 'stay' | 'leave';
  reduced: boolean;
};

/** One place of the amount. A new digit rolls in over the old one; new places open from nothing. */
function Cell({ glyph, width, height, style, color, dir, phase, reduced }: CellProps) {
  const [roll, setRoll] = useState({ ch: glyph.ch, prev: null as string | null, n: 0 });
  if (roll.ch !== glyph.ch) setRoll({ ch: glyph.ch, prev: roll.ch, n: roll.n + 1 });

  const p = useSharedValue(1);
  const open = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (roll.n === 0 || reduced) return;
    p.set(0);
    p.set(withSpring(1, spring('snappy')));
  }, [roll.n, reduced, p]);
  useEffect(() => {
    if (phase === 'leave') {
      open.set(withTiming(0, { duration: durations.base, easing: easings.exit }));
    } else {
      open.set(withSpring(1, spring('smooth', reduced)));
    }
  }, [phase, reduced, open]);

  const box = useAnimatedStyle(() =>
    width === undefined ? {} : { width: width * open.get(), opacity: open.get() },
  );
  const incoming = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - p.get()) * height * 0.6 * dir + (1 - open.get()) * height * 0.4 },
    ],
    opacity: Math.min(p.get(), open.get() * 1.5),
  }));
  const outgoing = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.get() * height * 0.6 * dir }],
    opacity: 1 - p.get(),
  }));

  return (
    <Animated.View style={[styles.cell, { height }, box]}>
      {roll.prev !== null && roll.prev !== roll.ch ? (
        <Animated.Text
          style={[style, styles.tabular, styles.ghost, { color, lineHeight: height }, outgoing]}
        >
          {roll.prev}
        </Animated.Text>
      ) : null}
      <Animated.Text style={[style, styles.tabular, { color, lineHeight: height }, incoming]}>
        {glyph.ch}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  measure: { position: 'absolute', opacity: 0, flexDirection: 'row', top: 0, left: 0 },
  frame: { alignSelf: 'center', minWidth: 160 },
  amount: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  tabular: { fontVariant: ['tabular-nums'], includeFontPadding: false },
  cell: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute' },
  caret: { width: 2, borderRadius: 1, marginLeft: 3 },
  input: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
});
