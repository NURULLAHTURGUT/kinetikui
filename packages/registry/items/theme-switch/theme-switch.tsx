import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ThemeMode = 'light' | 'dark';

export type ThemeSwitchProps = {
  value: ThemeMode;
  onValueChange: (value: ThemeMode) => void;
  /** Words beside the icon, e.g. "Dark mode". Leave out for an icon-only button. */
  label?: string;
  /** Read by screen readers when there is no visible label. Defaults to "Dark mode". */
  accessibilityLabel?: string;
  /** A tap as it switches. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const BOX = 48;
const ICON = 28;
const C = ICON / 2;

/**
 * A light and dark switch drawn as a sun that becomes a moon. The rays turn a
 * quarter and draw in, the core swells, and a shadow slides across it to
 * leave a crescent; the colour cools from amber to a pale blue on the way.
 */
export function ThemeSwitch({
  value,
  onValueChange,
  label,
  accessibilityLabel = 'Dark mode',
  haptics = true,
  testID,
  style,
}: ThemeSwitchProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const dark = value === 'dark';
  const p = useSharedValue(dark ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    p.set(withSpring(dark ? 1 : 0, spring('smooth', reduced)));
  }, [dark, reduced, p]);

  const ink = useDerivedValue(() =>
    interpolateColor(Math.min(1, Math.max(0, p.get())), [0, 1], [colors.warning, colors.sky]),
  );
  const core = useDerivedValue(() => 5.5 + p.get() * 3.5);
  const biteX = useDerivedValue(() => C + 14 - p.get() * 9.5);
  const biteY = useDerivedValue(() => C - 14 + p.get() * 10);
  const rays = useDerivedValue(() => {
    const t = Math.min(1, Math.max(0, p.get()));
    const b = Skia.PathBuilder.Make();
    const inner = 9;
    const outer = 12.5 - t * 3.5;
    if (outer - inner < 0.2) return b.detach();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * (Math.PI / 2);
      b.moveTo(C + Math.cos(a) * inner, C + Math.sin(a) * inner);
      b.lineTo(C + Math.cos(a) * outer, C + Math.sin(a) * outer);
    }
    return b.detach();
  });

  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.08 }] }));

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic('tap');
        onValueChange(dark ? 'light' : 'dark');
      }}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      accessibilityRole="switch"
      accessibilityLabel={label ?? accessibilityLabel}
      accessibilityState={{ checked: dark }}
      style={[styles.row, style]}
    >
      <Animated.View
        style={[
          styles.box,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            borderRadius: radius.pill,
          },
          shell,
        ]}
      >
        <Canvas style={styles.icon}>
          <Group layer>
            <Circle cx={C} cy={C} r={core} color={ink} />
            <Circle cx={biteX} cy={biteY} r={7.5} color={ink} blendMode="dstOut" />
          </Group>
          <Path path={rays} style="stroke" strokeWidth={2} strokeCap="round" color={ink} />
        </Canvas>
      </Animated.View>
      {label ? (
        <View style={styles.text}>
          <Text
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium }}
          >
            {label}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
            {dark ? 'On' : 'Off'}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: BOX,
    alignSelf: 'flex-start',
  },
  box: { width: BOX, height: BOX, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: ICON, height: ICON },
  text: { gap: 1 },
});
