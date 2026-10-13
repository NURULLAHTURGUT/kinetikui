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
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type LetterMorphProps = {
  /** The text. Change it and shared letters slide to their new places. */
  text: string;
  /** Style for the letters. Defaults to a large, semibold line in the theme text colour. */
  textStyle?: StyleProp<TextStyle>;
  /** Read by screen readers. Defaults to the text. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Glyph = { ch: string; key: string };
type Leaving = Glyph & { x: number };

const NBSP = String.fromCharCode(0xa0);

/**
 * Gives every letter of `next` a key, reusing the key of the same letter in
 * `prev` when one is still to come, so shared letters keep their identity and
 * the rest enter or leave.
 */
export function matchGlyphs(prev: readonly Glyph[], next: string, makeKey: () => string): Glyph[] {
  const used = new Array<boolean>(prev.length).fill(false);
  let from = 0;
  return Array.from(next).map((ch) => {
    for (let k = from; k < prev.length; k++) {
      if (!used[k] && prev[k]!.ch === ch) {
        used[k] = true;
        from = k + 1;
        return { ch, key: prev[k]!.key };
      }
    }
    return { ch, key: makeKey() };
  });
}

/**
 * A label that morphs into its next text letter by letter. Letters the two
 * words share slide to their new places, the ones that go float up and fade,
 * and new ones rise in where they belong: Save becomes Saved, Follow becomes
 * Following.
 *
 * Each distinct character is measured once; after that every letter moves by
 * transform on the UI thread, so a change never lays the screen out again
 * frame by frame.
 */
export function LetterMorph({
  text,
  textStyle,
  accessibilityLabel,
  testID,
  style,
}: LetterMorphProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();

  const letter = StyleSheet.flatten([
    {
      color: colors.text,
      fontSize: font.size['2xl'],
      fontWeight: font.weight.semibold,
      letterSpacing: font.tracking.tight,
    },
    textStyle,
  ]);
  const styleKey = JSON.stringify(letter);

  // Widths of the characters seen so far, for the current text style.
  const [metrics, setMetrics] = useState<{
    styleKey: string;
    widths: Record<string, number>;
    height: number;
  }>({ styleKey, widths: {}, height: 0 });
  if (metrics.styleKey !== styleKey) setMetrics({ styleKey, widths: {}, height: 0 });
  const { widths } = metrics;

  const place = (glyphs: readonly Glyph[]) => {
    let x = 0;
    return glyphs.map((g) => {
      const at = x;
      x += widths[g.ch] ?? 0;
      return at;
    });
  };

  // Keys for the current text, worked out again (from the previous keys) when it
  // changes. Letters that are not kept leave from where they were.
  const [state, setState] = useState(() => {
    let n = 0;
    return {
      text,
      glyphs: matchGlyphs([], text, () => `g${n++}`),
      next: n,
      leaving: [] as Leaving[],
      batch: 0,
    };
  });
  if (state.text !== text) {
    let n = state.next;
    const glyphs = matchGlyphs(state.glyphs, text, () => `g${n++}`);
    const kept = new Set(glyphs.map((g) => g.key));
    const before = place(state.glyphs);
    const leaving = reduced
      ? []
      : state.glyphs.map((g, i) => ({ ...g, x: before[i]! })).filter((g) => !kept.has(g.key));
    setState({ text, glyphs, next: n, leaving, batch: state.batch + 1 });
  }

  // Leaving letters are dropped once they have faded.
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

  const missing = [...new Set(Array.from(text))].filter((ch) => widths[ch] === undefined);
  const ready = missing.length === 0;
  const xs = place(state.glyphs);
  const last = state.glyphs[state.glyphs.length - 1];
  const total = ready && last ? xs[xs.length - 1]! + (widths[last.ch] ?? 0) : 0;

  const width = useSharedValue(total);
  const sized = useSharedValue(false);
  useEffect(() => {
    if (!ready) return;
    width.set(!sized.get() || reduced ? total : withSpring(total, spring('smooth')));
    sized.set(true);
  }, [ready, total, reduced, width, sized]);
  const box = useAnimatedStyle(() => ({ width: width.get() }));

  // Letters on screen when the component mounted appear without animating in.
  const [firstKeys] = useState(() => new Set(state.glyphs.map((g) => g.key)));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={style}
    >
      {/* Measures characters not seen before, out of sight. */}
      {missing.length > 0 ? (
        <View
          style={styles.measure}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          {missing.map((ch) => (
            <Text
              key={ch}
              style={letter}
              onLayout={(e) => {
                const { width: w, height: h } = e.nativeEvent.layout;
                setMetrics((m) =>
                  m.styleKey !== styleKey || m.widths[ch] !== undefined
                    ? m
                    : { ...m, widths: { ...m.widths, [ch]: w }, height: Math.max(m.height, h) },
                );
              }}
            >
              {ch === ' ' ? NBSP : ch}
            </Text>
          ))}
        </View>
      ) : null}
      <Animated.View style={[{ height: metrics.height || undefined }, box]}>
        {ready
          ? [
              ...state.leaving.map((g) => (
                <Letter
                  key={`${g.key}-out`}
                  ch={g.ch}
                  x={g.x}
                  leave
                  animateIn={false}
                  reduced={reduced}
                  style={letter}
                />
              )),
              ...state.glyphs.map((g, i) => (
                <Letter
                  key={g.key}
                  ch={g.ch}
                  x={xs[i]!}
                  leave={false}
                  animateIn={!firstKeys.has(g.key)}
                  reduced={reduced}
                  style={letter}
                />
              )),
            ]
          : null}
      </Animated.View>
    </View>
  );
}

type LetterProps = {
  ch: string;
  x: number;
  leave: boolean;
  animateIn: boolean;
  reduced: boolean;
  style: TextStyle;
};

function Letter({ ch, x, leave, animateIn, reduced, style }: LetterProps) {
  const tx = useSharedValue(x);
  const shown = useSharedValue(leave || !animateIn || reduced ? 1 : 0);

  useEffect(() => {
    tx.set(reduced ? x : withSpring(x, spring('smooth')));
  }, [x, reduced, tx]);
  useEffect(() => {
    if (leave) {
      shown.set(withTiming(0, { duration: durations.quick, easing: easings.exit }));
    } else if (shown.get() < 1) {
      shown.set(
        withDelay(60, withTiming(1, { duration: durations.base, easing: easings.standard })),
      );
    }
  }, [leave, shown]);

  const motion = useAnimatedStyle(() => {
    const p = shown.get();
    // New letters rise into place; leaving ones keep rising as they fade.
    const dy = leave ? -(1 - p) * 10 : (1 - p) * 10;
    return { opacity: p, transform: [{ translateX: tx.get() }, { translateY: dy }] };
  });

  return (
    <Animated.Text
      style={[style, styles.letter, motion]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {ch === ' ' ? NBSP : ch}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  measure: { position: 'absolute', opacity: 0, flexDirection: 'row', left: 0, top: 0 },
  letter: { position: 'absolute', left: 0, top: 0 },
});
