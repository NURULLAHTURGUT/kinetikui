import { useEffect, useRef, useState } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type TypewriterProps = {
  /** One phrase, or several typed in turn. */
  phrases: string | readonly string[];
  /** Fixed text before the typed part, e.g. "Find your way to ". */
  prefix?: string;
  /** Average time per character while typing, in ms. Defaults to 55. */
  speed?: number;
  /** Time per character while erasing, in ms. Defaults to 26. */
  eraseSpeed?: number;
  /** How long a finished phrase stays before it is erased, in ms. Defaults to 1800. */
  hold?: number;
  /** Go back to the first phrase after the last. Defaults to true. */
  loop?: boolean;
  /** Caret shape. Defaults to `bar`. */
  caret?: 'bar' | 'block' | 'underscore' | 'none';
  /** Caret colour. Defaults to the theme azure. */
  caretColor?: string;
  /** Called with a phrase's index once it is fully typed. */
  onPhraseTyped?: (index: number) => void;
  style?: StyleProp<TextStyle>;
  /** Style of the prefix, on top of `style`. */
  prefixStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

type Mode = 'typing' | 'holding' | 'erasing' | 'done';

const CARETS = { bar: '|', block: '▍', underscore: '_', none: '' } as const;
/** Caret blink half-period, in ms. */
const BLINK = 530;

/**
 * Text typed out a character at a time with a human rhythm: a little uneven,
 * pausing after punctuation. Several phrases are typed, held, erased and
 * replaced in turn. The caret stays solid while typing and blinks at rest.
 */
export function Typewriter({
  phrases,
  prefix,
  speed = 55,
  eraseSpeed = 26,
  hold = 1800,
  loop = true,
  caret = 'bar',
  caretColor,
  onPhraseTyped,
  style,
  prefixStyle,
  containerStyle,
}: TypewriterProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const list = typeof phrases === 'string' ? [phrases] : phrases;
  const signature = list.join('\u0000');

  const [state, setState] = useState<{ phrase: number; count: number; mode: Mode }>(() => ({
    phrase: 0,
    count: reduced ? (list[0]?.length ?? 0) : 0,
    mode: reduced ? 'holding' : 'typing',
  }));
  const [blinkOn, setBlinkOn] = useState(true);

  const typed = useRef(onPhraseTyped);
  useEffect(() => {
    typed.current = onPhraseTyped;
  }, [onPhraseTyped]);

  // A new set of phrases starts over.
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setState({
      phrase: 0,
      count: reduced ? (list[0]?.length ?? 0) : 0,
      mode: reduced ? 'holding' : 'typing',
    });
  }

  const text = list[state.phrase] ?? '';
  const many = list.length > 1;

  // One step per timeout: type or erase a character, or move between phrases.
  useEffect(() => {
    const { phrase, count, mode } = state;
    if (mode === 'done') return;
    const last = phrase === list.length - 1;
    let wait = 0;
    let next: typeof state;

    if (mode === 'typing' && count < text.length) {
      // Uneven like a person: quicker inside words, a beat after spaces and punctuation.
      const ch = text[count - 1] ?? '';
      const pause = /[.,!?;:]/.test(ch) ? 5 : ch === ' ' ? 1.6 : 1;
      wait = speed * pause * (0.6 + Math.random() * 0.8);
      next = { phrase, count: count + 1, mode };
    } else if (mode === 'typing') {
      typed.current?.(phrase);
      next = { phrase, count, mode: many && (loop || !last) ? 'holding' : 'done' };
    } else if (mode === 'holding') {
      wait = hold;
      const after = (phrase + 1) % list.length;
      if (!many || (!loop && last)) next = { phrase, count, mode: 'done' };
      // With reduced motion phrases swap whole instead of being erased and retyped.
      else if (reduced) next = { phrase: after, count: list[after]?.length ?? 0, mode };
      else next = { phrase, count, mode: 'erasing' };
    } else if (count > 0) {
      wait = eraseSpeed;
      next = { phrase, count: count - 1, mode };
    } else {
      next = { phrase: (phrase + 1) % list.length, count: 0, mode: 'typing' };
    }

    const id = setTimeout(() => setState(next), wait);
    return () => clearTimeout(id);
    // `list` is represented by `signature`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, signature, speed, eraseSpeed, hold, loop, reduced]);

  // The caret blinks only at rest; while the text moves it stays lit, like a real editor.
  const resting = state.mode === 'holding' || state.mode === 'done';
  useEffect(() => {
    if (!resting || caret === 'none') return;
    const id = setInterval(() => setBlinkOn((on) => !on), BLINK);
    return () => clearInterval(id);
  }, [resting, caret]);
  const caretShown = !resting || blinkOn;

  const base: StyleProp<TextStyle> = [
    {
      color: colors.text,
      fontSize: font.size['2xl'],
      fontWeight: font.weight.bold,
      letterSpacing: -0.4,
    },
    style,
  ];

  return (
    <View
      accessible
      accessibilityRole="text"
      // Screen readers get the whole phrase, never a half-typed one.
      accessibilityLabel={`${prefix ?? ''}${text}`}
      style={containerStyle}
    >
      <Text
        style={base}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {prefix ? <Text style={prefixStyle}>{prefix}</Text> : null}
        {text.slice(0, state.count)}
        {caret !== 'none' ? (
          <Text
            style={{
              color: caretColor ?? colors.azure,
              opacity: caretShown ? 1 : 0,
              fontWeight: caret === 'bar' ? font.weight.regular : undefined,
            }}
          >
            {CARETS[caret]}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}
