import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type EmptyStateAction = { label: string; onPress: () => void };

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Drawn on the front card of the illustration, e.g. an inbox or search icon. */
  icon?: ReactNode;
  /** The next step, as a solid button. */
  action?: EmptyStateAction;
  /** A quieter alternative, as a text button. */
  secondaryAction?: EmptyStateAction;
  /** Replays the entrance when it changes, e.g. the current filter. */
  playKey?: string | number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const CARD_W = 112;
const CARD_H = 84;

/**
 * A calm empty screen with somewhere to go next. Three cards rise and fan
 * out one after another, a blue dot lands on the front one, and the text and
 * actions settle in beneath. It plays once, then stays still.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  playKey,
  testID,
  style,
}: EmptyStateProps) {
  const { colors, font, radius, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const back = useSharedValue(0);
  const middle = useSharedValue(0);
  const front = useSharedValue(0);
  const dot = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    const cards = [back, middle, front];
    if (reduced) {
      [...cards, dot, text].forEach((v) => v.set(1));
      return;
    }
    [...cards, dot, text].forEach((v) => v.set(0));
    cards.forEach((v, i) => v.set(withDelay(i * 90, withSpring(1, spring('smooth')))));
    dot.set(withDelay(420, withSpring(1, spring('bouncy'))));
    text.set(withDelay(200, withSpring(1, spring('smooth'))));
  }, [reduced, playKey, back, middle, front, dot, text]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: text.get(),
    transform: [{ translateY: (1 - text.get()) * 10 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, dot.get() * 2),
    transform: [{ scale: dot.get() }],
  }));

  return (
    <View testID={testID} style={[styles.root, { gap: space[5] }, style]}>
      <View
        style={styles.art}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* Back to front: the two behind turn away from the middle as they rise. */}
        <Card
          t={back}
          angle={-9}
          dx={-22}
          background={colors.surface}
          border={colors.border}
          radius={radius.lg}
        />
        <Card
          t={middle}
          angle={8}
          dx={22}
          background={colors.surface}
          border={colors.border}
          radius={radius.lg}
        />
        <Card
          t={front}
          angle={0}
          dx={0}
          background={colors.surfaceRaised}
          border={colors.borderStrong}
          radius={radius.lg}
          lift={10}
          shadowStyle={shadow.md}
        >
          <View
            style={[styles.tile, { backgroundColor: colors.azureSoft, borderRadius: radius.sm }]}
          >
            {icon}
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[styles.bar, { width: '80%', backgroundColor: colors.track }]} />
            <View style={[styles.bar, { width: '50%', backgroundColor: colors.track }]} />
          </View>
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.azure, borderColor: colors.surfaceRaised },
              dotStyle,
            ]}
          />
        </Card>
      </View>

      <Animated.View style={[styles.copy, { gap: space[2] }, textStyle]}>
        <Text
          accessibilityRole="header"
          style={[
            styles.center,
            { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.semibold },
          ]}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[
              styles.center,
              { color: colors.textMuted, fontSize: font.size.md, lineHeight: 22 },
            ]}
          >
            {description}
          </Text>
        ) : null}
        {action || secondaryAction ? (
          <View style={[styles.actions, { marginTop: space[3], gap: space[1] }]}>
            {action ? (
              <Pressable
                onPress={action.onPress}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primary,
                  {
                    backgroundColor: colors.ember,
                    borderRadius: radius.pill,
                    transform: [{ scale: pressed && !reduced ? 0.97 : 1 }],
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
                  {action.label}
                </Text>
              </Pressable>
            ) : null}
            {secondaryAction ? (
              <Pressable
                onPress={secondaryAction.onPress}
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: font.size.sm,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {secondaryAction.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

type CardProps = {
  t: SharedValue<number>;
  angle: number;
  dx: number;
  background: string;
  border: string;
  radius: number;
  lift?: number;
  shadowStyle?: string;
  children?: ReactNode;
};

function Card({
  t,
  angle,
  dx,
  background,
  border,
  radius,
  lift = 0,
  shadowStyle,
  children,
}: CardProps) {
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: Math.min(1, p * 1.5),
      transform: [
        { translateX: dx * p },
        { translateY: (1 - p) * 26 - lift * p },
        { rotate: `${angle * p}deg` },
        { scale: 0.9 + p * 0.1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: background,
          borderColor: border,
          borderRadius: radius,
          boxShadow: shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: 8 },
  art: {
    width: CARD_W + 60,
    height: CARD_H + 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    width: CARD_W,
    height: CARD_H,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, borderRadius: 3 },
  dot: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  copy: { alignItems: 'center', maxWidth: 320 },
  center: { textAlign: 'center' },
  actions: { alignItems: 'center', alignSelf: 'stretch' },
  primary: { height: 48, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  secondary: {
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
