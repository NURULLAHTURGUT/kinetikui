import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type WordRotatorProps = {
  /** The words that take turns, e.g. ['alive', 'effortless', 'yours']. */
  words: readonly string[];
  /** Fixed text before the rotating word. */
  before?: string;
  /** Fixed text after the rotating word. */
  after?: string;
  /** Time each word stays, in ms. Defaults to 2400. */
  interval?: number;
  /** Delay between letters as a word rolls in, in ms. Defaults to 24. */
  stagger?: number;
  /** Hold on the current word, e.g. while off screen. */
  paused?: boolean;
  /** Line alignment. Defaults to `left`. */
  align?: 'left' | 'center';
  /** Style for all of the text. */
  style?: StyleProp<TextStyle>;
  /** Style for the rotating word, on top of `style`. Defaults to the theme azure. */
  wordStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Spaces inside a word, kept from collapsing when letters are laid out one by one. */
const NBSP = String.fromCharCode(0xa0);
/** How long one letter takes to roll, in ms. */
const LETTER = 420;

/**
 * A line with one word that keeps changing: the old word rolls up and out
 * letter by letter while the new one rolls in from below, and the gap it
 * sits in springs to the new word's width.
 */
export function WordRotator({
  words,
  before,
  after,
  interval = 2400,
  stagger = 24,
  paused = false,
  align = 'left',
  style,
  wordStyle,
  containerStyle,
}: WordRotatorProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const n = words.length;
  const [turn, setTurn] = useState({ now: 0, was: -1 });
  const [widths, setWidths] = useState<number[]>([]);
  const [lineH, setLineH] = useState(0);

  const clock = useSharedValue(0);
  useEffect(() => {
    if (paused || n < 2) return;
    const id = setInterval(() => {
      // Reset before the new letters mount, so they never show a frame at rest.
      clock.set(0);
      setTurn((t) => ({ now: (t.now + 1) % n, was: t.now }));
    }, interval);
    return () => clearInterval(id);
  }, [paused, n, interval, clock]);

  const width = useSharedValue(0);
  const longest = Math.max(1, ...words.map((w) => w.length));
  const total = LETTER + (longest - 1) * stagger;

  useEffect(() => {
    if (turn.was < 0) return;
    clock.set(withTiming(total, { duration: reduced ? 1 : total, easing: Easing.linear }));
  }, [turn, total, reduced, clock]);

  const target = widths[turn.now] ?? 0;
  useEffect(() => {
    if (target === 0) return;
    // The first width is set, not animated.
    width.set(width.get() === 0 ? target : withSpring(target, spring('smooth', reduced)));
  }, [target, reduced, width]);

  const slot = useAnimatedStyle(() => (width.get() > 0 ? { width: width.get() } : {}));

  const measure = (i: number) => (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    if (i === 0) setLineH(Math.ceil(e.nativeEvent.layout.height));
    setWidths((ws) => {
      if (ws[i] === w) return ws;
      const next = ws.slice();
      next[i] = w;
      return next;
    });
  };

  const text: StyleProp<TextStyle> = [
    {
      color: colors.text,
      fontSize: font.size['3xl'],
      fontWeight: font.weight.bold,
      letterSpacing: -0.8,
    },
    style,
  ];
  const accent: StyleProp<TextStyle> = [text, { color: colors.azure }, wordStyle];

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={[before, words.join(', '), after].filter(Boolean).join(' ')}
      style={[styles.line, align === 'center' && styles.center, containerStyle]}
    >
      {/* Every word, laid out off screen, to know each one's width. */}
      <View
        style={styles.measure}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {/* Measured letter by letter, exactly as the word is drawn. */}
        {words.map((w, i) => (
          <View key={`${w}-${i}`} style={[styles.word, styles.measured]} onLayout={measure(i)}>
            {Array.from(w).map((ch, j) => (
              <Text key={j} style={accent}>
                {ch === ' ' ? NBSP : ch}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {before ? (
        <Text style={text} importantForAccessibility="no" accessibilityElementsHidden>
          {`${before} `}
        </Text>
      ) : null}
      <Animated.View
        style={[styles.slot, lineH > 0 && { height: lineH }, slot]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {turn.was >= 0 ? (
          <Word
            key={`was-${turn.was}-${turn.now}`}
            word={words[turn.was] ?? ''}
            leaving
            clock={clock}
            stagger={stagger}
            height={lineH}
            reduced={reduced}
            style={accent}
          />
        ) : null}
        <Word
          key={`now-${turn.now}`}
          word={words[turn.now] ?? ''}
          leaving={false}
          clock={turn.was >= 0 ? clock : undefined}
          stagger={stagger}
          height={lineH}
          reduced={reduced}
          style={accent}
        />
      </Animated.View>
      {after ? (
        <Text style={text} importantForAccessibility="no" accessibilityElementsHidden>
          {` ${after}`}
        </Text>
      ) : null}
    </View>
  );
}

function Word({
  word,
  leaving,
  clock,
  stagger,
  height,
  reduced,
  style,
}: {
  word: string;
  leaving: boolean;
  /** Absent for the very first word, which simply sits in place. */
  clock?: SharedValue<number>;
  stagger: number;
  height: number;
  reduced: boolean;
  style: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.word, leaving && styles.stacked]}>
      {Array.from(word).map((ch, i) => (
        <Letter
          key={i}
          ch={ch}
          start={i * stagger}
          leaving={leaving}
          clock={clock}
          height={height}
          reduced={reduced}
          style={style}
        />
      ))}
    </View>
  );
}

function Letter({
  ch,
  start,
  leaving,
  clock,
  height,
  reduced,
  style,
}: {
  ch: string;
  start: number;
  leaving: boolean;
  clock?: SharedValue<number>;
  height: number;
  reduced: boolean;
  style: StyleProp<TextStyle>;
}) {
  const animated = useAnimatedStyle(() => {
    if (!clock) return {};
    const p = Math.max(0, Math.min(1, (clock.get() - start) / LETTER));
    // Ease-out quart: letters snap into place and settle.
    const e = 1 - (1 - p) ** 4;
    if (reduced) return { opacity: leaving ? 1 - p : p };
    const travel = height * 0.8;
    return leaving
      ? { opacity: 1 - e, transform: [{ translateY: -travel * e }] }
      : { opacity: e, transform: [{ translateY: travel * (1 - e) }] };
  });
  return <Animated.Text style={[style, animated]}>{ch === ' ' ? NBSP : ch}</Animated.Text>;
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  center: { justifyContent: 'center' },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0, width: 2000 },
  measured: { position: 'absolute', left: 0, top: 0 },
  slot: { overflow: 'hidden' },
  word: { flexDirection: 'row' },
  stacked: { position: 'absolute', left: 0, top: 0 },
});
