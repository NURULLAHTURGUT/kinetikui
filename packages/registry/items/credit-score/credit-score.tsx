import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type CreditScoreProps = {
  /** The score. 0 or below `min` means there is none yet. */
  score: number;
  /** Bottom of the scale. Defaults to 300. */
  min?: number;
  /** Top of the scale. Defaults to 850. */
  max?: number;
  title?: string;
  /** Icon before the title. */
  icon?: ReactNode;
  /** A button in the header, e.g. Apply. */
  action?: { label: string; icon?: ReactNode; onPress: () => void };
  /** Shown under the score while there is none. */
  emptyHint?: string;
  /** Number of bars in the meter. Defaults to 32. */
  bars?: number;
  style?: StyleProp<ViewStyle>;
};

/** Band names for a 300–850 style score, by share of the scale. */
export function scoreBand(share: number): string {
  if (share < 0.45) return 'Poor';
  if (share < 0.62) return 'Fair';
  if (share < 0.78) return 'Good';
  if (share < 0.9) return 'Very good';
  return 'Excellent';
}

/**
 * A credit score card: the number counts up in the sentence, and a meter of
 * thin bars lights from left to right in colours that warm from red through
 * amber to green, stopping at the score. With no score yet the bars rest
 * empty under a nudge to build history.
 */
export function CreditScore({
  score,
  min = 300,
  max = 850,
  title = 'Credit Score',
  icon,
  action,
  emptyHint = 'Feel free to build your credit history to see your score.',
  bars = 32,
  style,
}: CreditScoreProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const has = score >= min;
  const share = has ? Math.min(1, (score - min) / (max - min)) : 0;
  const shown = useCountUp(has ? score : 0, { instant: reduced, duration: 1200 });
  const lit = Math.round(share * bars);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.xl,
          boxShadow: shadow.md,
        },
        style,
      ]}
    >
      <View style={[styles.head, { padding: space[5], paddingBottom: space[4], gap: space[3] }]}>
        {icon}
        <Text
          accessibilityRole="header"
          style={[
            styles.grow,
            { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.medium },
          ]}
        >
          {title}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.button,
              {
                borderColor: colors.borderStrong,
                borderRadius: radius.md,
                gap: 6,
                backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
              },
            ]}
          >
            {action.icon}
            <Text style={{ color: colors.text, fontSize: font.size.md }}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.rule, { backgroundColor: colors.border, marginHorizontal: space[5] }]} />
      <View
        accessible
        accessibilityLabel={
          has
            ? `Your credit score is ${score}, ${scoreBand(share)}, on a scale of ${min} to ${max}`
            : `No credit score yet. ${emptyHint}`
        }
        style={{ padding: space[5], paddingTop: space[4], gap: space[1] }}
      >
        <Text style={{ fontSize: font.size.xl + 2, color: colors.textSubtle }}>
          Your{' '}
          <Text style={{ color: colors.text, fontWeight: font.weight.medium }}>credit score</Text>{' '}
          is{' '}
          <Text
            style={{
              color: colors.text,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {Math.round(shown)}
          </Text>
          {has ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>
              {'  '}
              {scoreBand(share)}
            </Text>
          ) : null}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.md }}>
          {has ? `On a scale of ${min} to ${max}.` : emptyHint}
        </Text>
        <View style={[styles.meter, { marginTop: space[4] }]}>
          {Array.from({ length: bars }, (_, i) => (
            <MeterBar key={i} index={i} count={bars} on={i < lit} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** One bar of the meter, lighting a beat after its left neighbour. */
function MeterBar({ index, count, on }: { index: number; count: number; on: boolean }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const light = useSharedValue(on && reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      light.set(on ? 1 : 0);
      return;
    }
    light.set(
      withDelay(on ? index * 28 : (count - index) * 10, withTiming(on ? 1 : 0, timing('base'))),
    );
  }, [on, index, count, reduced, light]);

  // Red at the start of the scale, amber in the middle, green at the end.
  const t = count <= 1 ? 1 : index / (count - 1);
  const hue = t < 0.5 ? [colors.danger, colors.warning] : [colors.warning, colors.success];
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const empty = withAlpha(colors.text, 0.08);

  const style = useAnimatedStyle(() => {
    const tone = interpolateColor(local, [0, 1], hue as [string, string]);
    return {
      backgroundColor: interpolateColor(light.get(), [0, 1], [empty, tone]),
      transform: [{ scaleY: 0.82 + light.get() * 0.18 }],
    };
  });
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  rule: { height: StyleSheet.hairlineWidth },
  meter: { flexDirection: 'row', justifyContent: 'space-between', height: 30 },
  bar: { width: 7, height: 30, borderRadius: 2 },
});
