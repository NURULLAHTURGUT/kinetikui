import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type InkCheckProps = {
  /** The line beside the box. It names the checkbox for screen readers. */
  label: string;
  /** A quieter line under the label. */
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Strike the label through when checked, as in a to-do list. Defaults to false. */
  strike?: boolean;
  /** Box fill when checked. Defaults to the theme azure. */
  color?: string;
  /** A tick as it checks. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const BOX = 22;
const BORDER = 1.5;
const STROKE = 2.5;
/** The tick as two strokes in the box's 22 pt space: down to the elbow, then up. */
const ELBOW = { x: 9.25, y: 15 };
const SHORT = { x: 5.5, y: 11.25, length: Math.hypot(ELBOW.x - 5.5, ELBOW.y - 11.25) };
const LONG = { x: 16.75, y: 6.75 };
const LONG_LENGTH = Math.hypot(LONG.x - ELBOW.x, LONG.y - ELBOW.y);
const SHORT_ANGLE = Math.atan2(ELBOW.y - SHORT.y, ELBOW.x - SHORT.x);
const LONG_ANGLE = Math.atan2(LONG.y - ELBOW.y, LONG.x - ELBOW.x);
/** Share of the stroke spent on the short leg, so the pen moves at one speed. */
const SPLIT = SHORT.length / (SHORT.length + LONG_LENGTH);

/**
 * A checkbox whose tick is inked in one stroke: down to the elbow, then up,
 * at the speed of a pen. The box fills behind it with a small press, and the
 * label can be struck through like a finished to-do.
 */
export function InkCheck({
  label,
  description,
  checked,
  onCheckedChange,
  strike = false,
  color,
  haptics = true,
  disabled = false,
  testID,
  style,
}: InkCheckProps) {
  const { colors, font, space, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const ink = color ?? colors.azure;
  const [labelWidth, setLabelWidth] = useState(0);

  const fill = useSharedValue(checked ? 1 : 0);
  const stroke = useSharedValue(checked ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    fill.set(withSpring(checked ? 1 : 0, spring('snappy', reduced)));
    // The tick draws after the box has started to fill, and erases quickly.
    stroke.set(
      reduced
        ? checked
          ? 1
          : 0
        : withTiming(checked ? 1 : 0, {
            duration: checked ? durations.slow : durations.quick,
            easing: easings.standard,
          }),
    );
  }, [checked, reduced, fill, stroke]);

  const toggle = () => {
    if (!checked) haptic('tick');
    onCheckedChange(!checked);
  };

  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.get(), [0, 1], [colors.surface, ink]),
    borderColor: interpolateColor(fill.get(), [0, 1], [colors.borderStrong, ink]),
    transform: [{ scale: 1 - press.get() * 0.12 + Math.sin(fill.get() * Math.PI) * 0.06 }],
  }));
  const shortLeg = useAnimatedStyle(() => ({
    width: SHORT.length * Math.min(1, stroke.get() / SPLIT),
  }));
  const longLeg = useAnimatedStyle(() => ({
    width: LONG_LENGTH * Math.max(0, (stroke.get() - SPLIT) / (1 - SPLIT)),
  }));
  const strikeLine = useAnimatedStyle(() => ({ width: labelWidth * stroke.get() }));
  const labelInk = useAnimatedStyle(() => ({
    color: strike
      ? interpolateColor(stroke.get(), [0, 1], [colors.text, colors.textMuted])
      : colors.text,
  }));

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={toggle}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled }}
      style={[styles.row, { gap: space[3], opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Animated.View style={[styles.box, { borderRadius: radius.xs }, box]}>
        <Animated.View
          style={[
            styles.leg,
            {
              left: SHORT.x - BORDER,
              top: SHORT.y - STROKE / 2 - BORDER,
              backgroundColor: colors.onAzure,
            },
            { transform: [{ rotate: `${SHORT_ANGLE}rad` }] },
            shortLeg,
          ]}
        />
        <Animated.View
          style={[
            styles.leg,
            {
              left: ELBOW.x - BORDER,
              top: ELBOW.y - STROKE / 2 - BORDER,
              backgroundColor: colors.onAzure,
            },
            { transform: [{ rotate: `${LONG_ANGLE}rad` }] },
            longLeg,
          ]}
        />
      </Animated.View>
      <View style={styles.text}>
        <View style={styles.labelRow}>
          <Animated.Text
            numberOfLines={1}
            onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
            style={[{ fontSize: font.size.md, fontWeight: font.weight.medium }, labelInk]}
          >
            {label}
          </Animated.Text>
          {strike ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.strike, { backgroundColor: colors.textMuted }, strikeLine]}
            />
          ) : null}
        </View>
        {description ? (
          <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget,
    paddingVertical: 6,
  },
  box: { width: BOX, height: BOX, borderWidth: BORDER },
  // Each leg grows from its start point; the origin keeps that point fixed while it turns.
  leg: {
    position: 'absolute',
    height: STROKE,
    borderRadius: STROKE / 2,
    transformOrigin: 'left center',
  },
  text: { flex: 1, gap: 2 },
  labelRow: { alignSelf: 'flex-start', maxWidth: '100%' },
  strike: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: 0.5,
    height: 1.5,
    borderRadius: 1,
  },
});
