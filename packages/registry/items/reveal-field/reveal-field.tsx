import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type RevealFieldProps = Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText' | 'secureTextEntry' | 'multiline'
> & {
  /** Shown above the field and used as its accessible name. Defaults to "Password". */
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Start with the text visible. Defaults to false. */
  defaultRevealed?: boolean;
  /** A light tap when the eye toggles. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 52;
const ICON = 24;

const EYE = Skia.PathBuilder.Make()
  .moveTo(2.5, 12)
  .cubicTo(5.5, 6.5, 9, 5, 12, 5)
  .cubicTo(15, 5, 18.5, 6.5, 21.5, 12)
  .cubicTo(18.5, 17.5, 15, 19, 12, 19)
  .cubicTo(9, 19, 5.5, 17.5, 2.5, 12)
  .close()
  .detach();

const SLASH = Skia.PathBuilder.Make().moveTo(4, 4).lineTo(20, 20).detach();

/**
 * A password field with an eye that blinks. Tapping it shuts and reopens the
 * lid while the text dips and turns between dots and letters, and the slash
 * across the eye draws in or wipes away.
 */
export function RevealField({
  label = 'Password',
  value,
  onChangeText,
  defaultRevealed = false,
  haptics = true,
  editable = true,
  onFocus,
  onBlur,
  testID,
  style,
  ...input
}: RevealFieldProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [revealed, setRevealed] = useState(defaultRevealed);
  const [focused, setFocused] = useState(false);

  const lid = useSharedValue(1);
  const slash = useSharedValue(revealed ? 0 : 1);
  const ring = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    ring.set(withTiming(focused ? 1 : 0, timing('quick', reduced)));
  }, [focused, reduced, ring]);

  const toggle = () => {
    const next = !revealed;
    haptic('tap');
    setRevealed(next);
    if (reduced) {
      slash.set(next ? 0 : 1);
      return;
    }
    const half = { duration: durations.quick / 1.5, easing: easings.standard };
    lid.set(withSequence(withTiming(0.08, half), withSpring(1, spring('bouncy'))));
    fade.set(withSequence(withTiming(0.35, half), withTiming(1, timing('base'))));
    slash.set(withTiming(next ? 0 : 1, timing('base')));
  };

  const eye = useDerivedValue(() => [
    { translateY: 12 },
    { scaleY: lid.get() },
    { translateY: -12 },
  ]);
  const text = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const outline = useAnimatedStyle(() => ({ opacity: ring.get() }));
  const ink = focused ? colors.text : colors.textMuted;

  return (
    <View testID={testID} style={[{ gap: space[2], opacity: editable ? 1 : 0.5 }, style]}>
      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            borderRadius: radius.md,
            paddingLeft: space[4],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderColor: colors.azure, borderRadius: radius.md + 1 }, outline]}
        />
        <Animated.View style={[styles.grow, text]}>
          <TextInput
            {...input}
            value={value}
            onChangeText={onChangeText}
            editable={editable}
            secureTextEntry={!revealed}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={label}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.azure}
            cursorColor={colors.azure}
            style={[
              styles.input,
              {
                color: colors.text,
                fontSize: font.size.md,
                letterSpacing: revealed ? font.tracking.normal : font.tracking.wide,
              },
            ]}
          />
        </Animated.View>
        <Pressable
          onPress={toggle}
          disabled={!editable}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          style={styles.toggle}
        >
          <Canvas style={styles.icon}>
            <Group transform={eye}>
              <Path path={EYE} style="stroke" strokeWidth={1.8} strokeJoin="round" color={ink} />
              <Circle cx={12} cy={12} r={3.2} color={ink} />
            </Group>
            {/* A wider stroke in the field colour cuts the eye where the slash crosses it. */}
            <Path
              path={SLASH}
              style="stroke"
              strokeWidth={4.5}
              strokeCap="round"
              color={colors.surface}
              end={slash}
            />
            <Path
              path={SLASH}
              style="stroke"
              strokeWidth={1.8}
              strokeCap="round"
              color={ink}
              end={slash}
            />
          </Canvas>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: HEIGHT, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  ring: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2 },
  grow: { flex: 1, alignSelf: 'stretch' },
  input: { flex: 1, padding: 0 },
  toggle: {
    width: minTouchTarget + 4,
    height: HEIGHT - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: ICON, height: ICON },
});
