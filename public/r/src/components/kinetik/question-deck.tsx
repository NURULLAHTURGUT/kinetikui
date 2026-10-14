import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type DeckQuestion = {
  id: string;
  title: string;
  options: readonly string[];
  /** Small caps line above the options. Defaults to "Select only one". */
  hint?: string;
};

export type QuestionDeckProps = {
  questions: readonly DeckQuestion[];
  /** Called from the last question with every answer, by question id. */
  onComplete: (answers: Record<string, string>) => void;
  /** Shows a close button. */
  onClose?: () => void;
  /** Colour of the Next button. Defaults to the theme success green. */
  accent?: string;
  nextLabel?: string;
  finishLabel?: string;
  backLabel?: string;
  /** A tick on each choice and step. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, monospace',
});

/**
 * A short questionnaire on a card resting on a loose stack of cards. Each
 * answer fills its radio with a spring; Next slides the next question in
 * while the cards behind shuffle, and the progress dashes fill as you go.
 */
export function QuestionDeck({
  questions,
  onComplete,
  onClose,
  accent,
  nextLabel = 'Next',
  finishLabel = 'Finish',
  backLabel = 'Back',
  haptics = true,
  style,
}: QuestionDeckProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const shuffle = useSharedValue(0);
  const q = questions[index];
  const last = index === questions.length - 1;
  const fill = accent ?? colors.success;

  useEffect(() => {
    if (reduced) return;
    shuffle.set(withSequence(withTiming(1, timing('base')), withSpring(0, spring('bouncy'))));
  }, [index, reduced, shuffle]);

  const behind = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-7 - shuffle.get() * 4}deg` },
      { translateX: -8 - shuffle.get() * 10 },
    ],
  }));
  const middle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${5 + shuffle.get() * 3}deg` }, { translateX: 10 + shuffle.get() * 8 }],
  }));

  if (!q) return null;
  const picked = answers[q.id];

  const go = (to: number) => {
    haptic('tick');
    setBack(to < index);
    setIndex(to);
  };

  const enter = reduced
    ? FadeIn.duration(durations.quick)
    : (back ? SlideInLeft : SlideInRight).duration(durations.slow).easing(easings.standard);

  const sheet = {
    // A step off the page colour on either theme, so the loose cards read.
    backgroundColor: colors.skeleton,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl + 4,
  };

  return (
    <View style={[styles.stage, style]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.back, sheet, behind]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.back, sheet, middle]}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceRaised,
            borderRadius: radius.xl + 4,
            padding: space[6],
            boxShadow: shadow.md,
          },
        ]}
      >
        <View style={[styles.top, { gap: space[2] }]}>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Questions"
            accessibilityValue={{
              min: 1,
              max: questions.length,
              now: index + 1,
              text: `Question ${index + 1} of ${questions.length}`,
            }}
            style={[styles.dashes, { gap: 6 }]}
          >
            {questions.map((item, i) => (
              <Dash key={item.id} state={i < index ? 'done' : i === index ? 'now' : 'next'} />
            ))}
          </View>
          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.close}
            >
              <View style={[styles.closeDot, { backgroundColor: colors.textSubtle }]}>
                <View style={[styles.cross, { backgroundColor: colors.surfaceRaised }]} />
                <View
                  style={[
                    styles.cross,
                    styles.crossBack,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                />
              </View>
            </Pressable>
          ) : null}
        </View>

        <Animated.View key={q.id} entering={enter} style={{ gap: space[5], marginTop: space[6] }}>
          <View style={{ gap: space[3] }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: MONO,
                fontSize: font.size.xs,
                letterSpacing: 1,
              }}
            >
              QUESTION {String(index + 1).padStart(2, '0')}
            </Text>
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: font.size.xl + 4,
                lineHeight: 32,
                fontWeight: font.weight.medium,
                letterSpacing: font.tracking.tight,
              }}
            >
              {q.title}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
            <Text
              style={{
                color: colors.textSubtle,
                fontFamily: MONO,
                fontSize: font.size.xs,
                letterSpacing: 1,
                marginBottom: space[1],
              }}
            >
              {(q.hint ?? 'Select only one').toUpperCase()}
            </Text>
            {q.options.map((option) => (
              <Option
                key={option}
                label={option}
                on={picked === option}
                onPress={() => {
                  haptic('tick');
                  setAnswers((a) => ({ ...a, [q.id]: option }));
                }}
              />
            ))}
          </View>
        </Animated.View>

        <View style={[styles.actions, { gap: space[2], marginTop: space[8] }]}>
          {index > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => go(index - 1)}
              style={[styles.button, { paddingHorizontal: space[5] }]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: font.size.md,
                  fontWeight: font.weight.medium,
                }}
              >
                {backLabel}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !picked }}
            disabled={!picked}
            onPress={() => {
              if (last) {
                haptic('success');
                onComplete(answers);
              } else go(index + 1);
            }}
            style={({ pressed }) => [
              styles.button,
              {
                paddingHorizontal: space[8],
                backgroundColor: fill,
                borderRadius: radius.md,
                opacity: picked ? 1 : 0.4,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text
              style={{
                color: colors.onEmber,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {last ? finishLabel : nextLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** A progress dash that widens and darkens for the current question. */
function Dash({ state }: { state: 'done' | 'now' | 'next' }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const now = useSharedValue(state === 'now' ? 1 : 0);
  useEffect(() => {
    const v = state === 'now' ? 1 : 0;
    now.set(reduced ? v : withSpring(v, spring('smooth')));
  }, [state, reduced, now]);
  const style = useAnimatedStyle(() => ({ width: 22 + now.get() * 14 }));
  return (
    <Animated.View
      style={[
        styles.dash,
        {
          backgroundColor: state === 'next' ? colors.track : colors.text,
          opacity: state === 'done' ? 0.45 : 1,
        },
        style,
      ]}
    />
  );
}

function Option({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const dot = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    dot.set(reduced ? (on ? 1 : 0) : withSpring(on ? 1 : 0, spring('bouncy')));
  }, [on, reduced, dot]);
  const inner = useAnimatedStyle(() => ({ transform: [{ scale: dot.get() }] }));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.option, { gap: space[3] }]}
    >
      <View style={[styles.radio, { borderColor: colors.text }]}>
        <Animated.View style={[styles.radioDot, { backgroundColor: colors.text }, inner]} />
      </View>
      <Text style={{ color: colors.text, fontSize: font.size.md + 1 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { padding: 14 },
  back: { margin: 14, borderWidth: StyleSheet.hairlineWidth },
  card: {},
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashes: { flexDirection: 'row', flexShrink: 1 },
  dash: { height: 4, borderRadius: 2 },
  close: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
    marginVertical: -12,
  },
  closeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    position: 'absolute',
    width: 10,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  crossBack: { transform: [{ rotate: '-45deg' }] },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
