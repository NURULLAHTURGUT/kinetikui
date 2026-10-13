import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type SlotTextProps = {
  /** The text. Change it and every reel spins to its new character. */
  text: string;
  /** Style for the characters. Defaults to a large, bold line in the theme text colour. */
  textStyle?: StyleProp<TextStyle>;
  /** Characters each reel passes on the way. Defaults to 6. */
  spins?: number;
  /** Delay between one reel and the next, in ms. Defaults to 45. */
  stagger?: number;
  /** Read by screen readers. Defaults to the text. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const NBSP = String.fromCharCode(0xa0);
const DIGITS = '0123456789';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const SPIN = 520;
// Quick off the mark, then a long, soft landing like a reel braking.
const LAND = Easing.bezier(0.18, 0.7, 0.2, 1);

/**
 * The characters a reel passes between `from` and `to`, drawn from the same
 * kind as the target (digits for digits, letters for letters). Seeded, so a
 * render always gives the same reel.
 */
export function reelGlyphs(to: string, count: number, seed: number): string[] {
  const set = /\d/.test(to) ? DIGITS : /[A-Z]/.test(to) ? UPPER : /[a-z]/.test(to) ? LOWER : '';
  if (!set) return [];
  let s = (seed * 2654435761) >>> 0 || 1;
  return Array.from({ length: count }, () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return set[s % set.length]!;
  });
}

/**
 * Text that changes like a slot machine. Each character is a reel that spins
 * through a few glyphs of its own kind and brakes onto the new character,
 * left to right, while the reel's width eases to fit what it lands on.
 */
export function SlotText({
  text,
  textStyle,
  spins = 6,
  stagger = 45,
  accessibilityLabel,
  testID,
  style,
}: SlotTextProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const glyph = StyleSheet.flatten([
    {
      color: colors.text,
      fontSize: font.size['3xl'],
      fontWeight: font.weight.bold,
      letterSpacing: font.tracking.tight,
    },
    textStyle,
  ]);
  const size = glyph.fontSize ?? font.size['3xl'];
  const lineHeight = glyph.lineHeight ?? Math.round(size * 1.2);
  const styleKey = JSON.stringify(glyph);

  // Character widths, measured once per character and text style.
  const [metrics, setMetrics] = useState({ styleKey, widths: {} as Record<string, number> });
  if (metrics.styleKey !== styleKey) setMetrics({ styleKey, widths: {} });
  const { widths } = metrics;

  // While text changes length, the longer of the two keeps its reels so the
  // extra ones can spin away to nothing. Once every reel has stopped, the
  // spare reels and the spin strips are dropped.
  const [state, setState] = useState({ text, prev: text, gen: 0, slots: text.length });
  if (state.text !== text) {
    setState({
      text,
      prev: state.text,
      gen: state.gen + 1,
      slots: Math.max(state.text.length, text.length),
    });
  }
  const { gen, slots } = state;
  const settled = state.prev === state.text;
  const settleAfter = SPIN + spins * 18 + slots * stagger + 60;
  useEffect(() => {
    if (settled) return;
    const id = setTimeout(
      () => setState((s) => (s.gen === gen ? { ...s, prev: s.text, slots: s.text.length } : s)),
      reduced ? 0 : settleAfter,
    );
    return () => clearTimeout(id);
  }, [gen, settled, reduced, settleAfter]);

  const chars = Array.from(text);
  const prevChars = Array.from(state.prev);
  const missing = [...new Set(chars)].filter((c) => widths[c] === undefined);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[styles.row, style]}
    >
      {missing.length > 0 ? (
        <View
          style={styles.measure}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          {missing.map((c) => (
            <Text
              key={c}
              style={glyph}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                setMetrics((m) =>
                  m.styleKey !== styleKey || m.widths[c] !== undefined
                    ? m
                    : { ...m, widths: { ...m.widths, [c]: w } },
                );
              }}
            >
              {c === ' ' ? NBSP : c}
            </Text>
          ))}
        </View>
      ) : null}
      {Array.from({ length: Math.max(slots, chars.length) }, (_, i) => {
        const to = chars[i] ?? '';
        const from = prevChars[i] ?? '';
        return (
          <Reel
            key={i}
            from={from}
            to={to}
            gen={gen}
            index={i}
            width={to === '' ? 0 : widths[to]}
            spins={spins}
            delay={i * stagger}
            lineHeight={lineHeight}
            glyph={glyph}
            reduced={reduced}
          />
        );
      })}
    </View>
  );
}

type ReelProps = {
  from: string;
  to: string;
  gen: number;
  index: number;
  width: number | undefined;
  spins: number;
  delay: number;
  lineHeight: number;
  glyph: TextStyle;
  reduced: boolean;
};

function Reel({
  from,
  to,
  gen,
  index,
  width,
  spins,
  delay,
  lineHeight,
  glyph,
  reduced,
}: ReelProps) {
  const spinning = gen > 0 && from !== to && !reduced;
  const strip = spinning ? [from, ...reelGlyphs(to || from, spins, gen * 31 + index), to] : [to];
  const travel = (strip.length - 1) * lineHeight;
  const y = useSharedValue(0);
  const w = useSharedValue(width ?? 0);

  useEffect(() => {
    if (!spinning) {
      y.set(0);
      return;
    }
    y.set(0);
    y.set(withDelay(delay, withTiming(-travel, { duration: SPIN + spins * 18, easing: LAND })));
  }, [gen, spinning, travel, delay, spins, y]);
  useEffect(() => {
    if (width === undefined) return;
    w.set(reduced ? width : withDelay(delay, withTiming(width, { duration: SPIN, easing: LAND })));
  }, [width, delay, reduced, w]);

  const box = useAnimatedStyle(() => (width === undefined ? {} : { width: w.get() }));
  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Animated.View
      style={[styles.reel, { height: lineHeight }, box]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={roll}>
        {strip.map((c, i) => (
          <Text key={i} style={[glyph, styles.cell, { lineHeight, height: lineHeight }]}>
            {c === ' ' || c === '' ? NBSP : c}
          </Text>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'flex-start' },
  measure: { position: 'absolute', opacity: 0, flexDirection: 'row', left: 0, top: 0 },
  reel: { overflow: 'hidden', alignItems: 'center' },
  cell: { textAlign: 'center', includeFontPadding: false },
});
