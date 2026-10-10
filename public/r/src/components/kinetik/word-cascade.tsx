import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type WordCascadeProps = {
  text: string;
  /** Delay between consecutive words, in ms. Defaults to 45. */
  stagger?: number;
  /** How long each word takes to arrive, in ms. Defaults to the `slow` duration. */
  wordDuration?: number;
  /** Wait before the first word, in ms. Defaults to 0. */
  delay?: number;
  /** Distance each word rises, in pt. Defaults to 10. */
  rise?: number;
  /** Change this value to replay. */
  replayKey?: string | number;
  /** Play on first render. Defaults to true. */
  animateOnMount?: boolean;
  onDone?: () => void;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A paragraph that arrives word by word: each word rises a few points and
 * fades in, slightly after the one before it. One clock drives every word.
 */
export function WordCascade({
  text,
  stagger = 45,
  wordDuration = durations.slow,
  delay = 0,
  rise = 10,
  replayKey,
  animateOnMount = true,
  onDone,
  style,
  containerStyle,
}: WordCascadeProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  // Split on spaces but keep line breaks as their own tokens.
  const words = useMemo(() => text.split(/(\n)| +/).filter((w): w is string => !!w), [text]);
  const total = delay + Math.max(0, words.length - 1) * stagger + wordDuration;
  const clock = useSharedValue(animateOnMount && !reduced ? 0 : total);
  const first = useRef(true);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const skip = reduced || (first.current && !animateOnMount);
    first.current = false;
    if (skip) {
      clock.set(total);
      return;
    }
    const finished = () => onDoneRef.current?.();
    clock.set(0);
    clock.set(
      withTiming(total, { duration: total, easing: Easing.linear }, (done) => {
        'worklet';
        if (done) scheduleOnRN(finished);
      }),
    );
    // Replays when the text or replayKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, replayKey, reduced]);

  const textStyle: StyleProp<TextStyle> = [
    {
      color: colors.text,
      fontSize: font.size.lg,
      lineHeight: font.size.lg * font.lineHeight.relaxed,
    },
    style,
  ];

  let index = 0;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[styles.flow, containerStyle]}
    >
      {words.map((word, i) => {
        if (word === '\n') return <View key={`br${i}`} style={styles.lineBreak} />;
        const at = delay + index++ * stagger;
        return (
          <Word
            key={`${i}-${word}`}
            word={word}
            start={at}
            length={wordDuration}
            rise={rise}
            clock={clock}
            style={textStyle}
          />
        );
      })}
    </View>
  );
}

function Word({
  word,
  start,
  length,
  rise,
  clock,
  style,
}: {
  word: string;
  start: number;
  length: number;
  rise: number;
  clock: SharedValue<number>;
  style: StyleProp<TextStyle>;
}) {
  const animated = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (clock.get() - start) / length));
    // Ease-out cubic: words decelerate into place.
    const e = 1 - (1 - p) * (1 - p) * (1 - p);
    return { opacity: e, transform: [{ translateY: (1 - e) * rise }] };
  });
  return (
    <Animated.Text
      style={[style, animated]}
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      {word}{' '}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  lineBreak: { width: '100%', height: 0 },
});
