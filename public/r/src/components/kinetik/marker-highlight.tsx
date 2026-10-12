import { useEffect, useMemo } from 'react';
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
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type MarkerHighlightProps = {
  text: string;
  /** Phrases in `text` to mark, in reading order. Each marks its first match. */
  highlights: readonly string[];
  /** `marker` paints behind the words; `underline` draws a line under them. Defaults to `marker`. */
  variant?: 'marker' | 'underline';
  /** Ink colour. Defaults to the theme azure. */
  color?: string;
  /** Run the sweep. Set it when the text scrolls into view; defaults to true (on mount). */
  play?: boolean;
  /** Wait before the first sweep, in ms. Defaults to 250. */
  delay?: number;
  /** Time to sweep one character, in ms. Defaults to 28. */
  speed?: number;
  style?: StyleProp<TextStyle>;
  /** Style for marked words, on top of `style`. */
  highlightStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Pause between one marked phrase and the next, in ms. */
const BREATH = 160;

type Token = {
  word: string;
  /** Index of the phrase this word belongs to, or -1. */
  mark: number;
  /** Whether the next word belongs to the same phrase, so the ink carries over the space. */
  joined: boolean;
  /** When this word's ink starts and how long it takes, in ms. */
  start: number;
  length: number;
};

/** Splits the text into words and works out which are marked and when their ink runs. */
function tokenize(text: string, highlights: readonly string[], speed: number): Token[] {
  // Character ranges of each phrase's first match, searched in order.
  const ranges: { from: number; to: number }[] = [];
  let from = 0;
  for (const phrase of highlights) {
    const at = phrase ? text.indexOf(phrase, from) : -1;
    ranges.push(at < 0 ? { from: -1, to: -1 } : { from: at, to: at + phrase.length });
    if (at >= 0) from = at + phrase.length;
  }

  const tokens: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const a = m.index;
    const b = a + m[0].length;
    const mark = ranges.findIndex((r) => r.from >= 0 && a < r.to && b > r.from);
    tokens.push({ word: m[0], mark, joined: false, start: 0, length: 0 });
  }

  // Ink runs phrase after phrase, word after word, at a steady pace per character.
  let clock = 0;
  for (let p = 0; p < highlights.length; p++) {
    const words = tokens.filter((t) => t.mark === p);
    words.forEach((t, i) => {
      t.joined = i < words.length - 1;
      t.start = clock;
      t.length = (t.word.length + (t.joined ? 1 : 0)) * speed;
      clock += t.length;
    });
    if (words.length > 0) clock += BREATH;
  }
  return tokens;
}

/**
 * A paragraph where a few phrases get marked, as if with a highlighter: the
 * ink sweeps behind each phrase from left to right, one after another, and
 * carries across line breaks word by word.
 */
export function MarkerHighlight({
  text,
  highlights,
  variant = 'marker',
  color,
  play = true,
  delay = 250,
  speed = 28,
  style,
  highlightStyle,
  containerStyle,
}: MarkerHighlightProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const ink = color ?? colors.azure;

  const signature = highlights.join('\u0000');
  const tokens = useMemo(
    () => tokenize(text, highlights, speed),
    // `signature` stands in for `highlights`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, signature, speed],
  );
  const total = tokens.reduce((end, t) => Math.max(end, t.start + t.length), 0);

  const clock = useSharedValue(play && reduced ? total : 0);
  useEffect(() => {
    if (!play) {
      clock.set(0);
      return;
    }
    if (reduced) {
      clock.set(total);
      return;
    }
    clock.set(0);
    clock.set(withDelay(delay, withTiming(total, { duration: total, easing: Easing.linear })));
  }, [play, reduced, total, delay, clock]);

  const base: StyleProp<TextStyle> = [
    {
      color: colors.text,
      fontSize: font.size.lg,
      lineHeight: font.size.lg * font.lineHeight.relaxed,
    },
    style,
  ];
  const marked: StyleProp<TextStyle> = [base, { fontWeight: font.weight.semibold }, highlightStyle];

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[styles.flow, containerStyle]}
    >
      {tokens.map((t, i) =>
        t.mark < 0 ? (
          <Text key={i} style={base} accessibilityElementsHidden importantForAccessibility="no">
            {`${t.word} `}
          </Text>
        ) : (
          <View
            key={i}
            style={styles.word}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {/* Inside a phrase the ink covers the space too, so it runs on unbroken. */}
            <View>
              <Ink token={t} clock={clock} color={ink} variant={variant} />
              <Text style={marked}>{t.joined ? `${t.word} ` : t.word}</Text>
            </View>
            {t.joined ? null : <Text style={base}> </Text>}
          </View>
        ),
      )}
    </View>
  );
}

function Ink({
  token,
  clock,
  color,
  variant,
}: {
  token: Token;
  clock: SharedValue<number>;
  color: string;
  variant: 'marker' | 'underline';
}) {
  const { start, length, joined } = token;
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (clock.get() - start) / Math.max(1, length)));
    // The first and last stretch of a phrase ease; joins in the middle run straight.
    const e = joined ? p : 1 - (1 - p) * (1 - p);
    return { width: `${e * 100}%` };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        variant === 'marker' ? styles.marker : styles.underline,
        { backgroundColor: variant === 'marker' ? withAlpha(color, 0.26) : color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flow: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { flexDirection: 'row' },
  marker: { position: 'absolute', left: -2, top: '22%', bottom: '8%', borderRadius: 4 },
  underline: { position: 'absolute', left: 0, bottom: '6%', height: 2.5, borderRadius: 2 },
});
