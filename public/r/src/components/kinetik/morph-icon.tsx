import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type MorphIconPair = 'menu-close' | 'play-pause' | 'plus-close' | 'plus-check';

export type MorphIconProps = {
  /** The two glyphs the icon moves between: off, then on. */
  pair: MorphIconPair;
  /** Controlled state. Leave unset to let the icon keep its own. */
  value?: boolean;
  /** Initial state when uncontrolled. Defaults to false. */
  defaultValue?: boolean;
  onValueChange?: (next: boolean) => void;
  /**
   * What the button does, e.g. "Menu". With `activeAccessibilityLabel` the
   * label swaps instead ("Play" / "Pause") and the button is not a toggle.
   */
  accessibilityLabel: string;
  /** Label while on, for buttons whose action changes rather than toggles. */
  activeAccessibilityLabel?: string;
  /** `ghost` has no fill, `soft` a quiet one, `solid` an azure disc. Defaults to `soft`. */
  variant?: 'ghost' | 'soft' | 'solid';
  /** Diameter of the button. The glyph is half of it. Defaults to 48. */
  size?: number;
  /** Glyph colour. Defaults to the variant's ink. */
  color?: string;
  /** A light tap as the state changes. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Glyph = {
  /** Strokes (or polygons when filled) on a 24 pt grid, as flat x, y lists. */
  off: readonly (readonly number[])[];
  /** The same strokes in the on state, point for point, so the two can be blended. */
  on: readonly (readonly number[])[];
  filled: boolean;
  /** Degrees the whole glyph turns on its way to the on state. */
  turn: number;
};

// The middle bar of the menu folds onto the first diagonal, so three bars
// become two without anything fading. Plus to close is the same plus, turned.
const GLYPHS: Record<MorphIconPair, Glyph> = {
  'menu-close': {
    off: [
      [4, 6.5, 20, 6.5],
      [4, 12, 20, 12],
      [4, 17.5, 20, 17.5],
    ],
    on: [
      [6, 6, 18, 18],
      [6, 6, 18, 18],
      [6, 18, 18, 6],
    ],
    filled: false,
    turn: 180,
  },
  'play-pause': {
    // The triangle is two quads that straighten into the two bars.
    off: [
      [7.5, 4.5, 12.5, 7.6, 12.5, 16.4, 7.5, 19.5],
      [12.5, 7.6, 19.5, 12, 19.5, 12, 12.5, 16.4],
    ],
    on: [
      [6.5, 5, 10.25, 5, 10.25, 19, 6.5, 19],
      [13.75, 5, 17.5, 5, 17.5, 19, 13.75, 19],
    ],
    filled: true,
    turn: 0,
  },
  'plus-close': {
    off: [
      [12, 5, 12, 19],
      [5, 12, 19, 12],
    ],
    on: [
      [12, 5, 12, 19],
      [5, 12, 19, 12],
    ],
    filled: false,
    turn: 135,
  },
  'plus-check': {
    off: [
      [12, 5, 12, 19],
      [5, 12, 19, 12],
    ],
    on: [
      [5, 12.5, 9.75, 17.25],
      [9.75, 17.25, 19, 7],
    ],
    filled: false,
    turn: 0,
  },
};

/**
 * An icon button whose glyph reshapes itself between two states: the menu
 * bars fold into a cross, play straightens into pause, a plus turns into a
 * cross or bends into a check. Every point travels on the UI thread.
 */
export function MorphIcon({
  pair,
  value,
  defaultValue = false,
  onValueChange,
  accessibilityLabel,
  activeAccessibilityLabel,
  variant = 'soft',
  size = 48,
  color,
  haptics = true,
  disabled = false,
  testID,
  style,
}: MorphIconProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [inner, setInner] = useState(defaultValue);
  const on = value ?? inner;

  const glyph = GLYPHS[pair];
  const box = size / 2;
  const unit = box / 24;
  const ink = color ?? (variant === 'solid' ? colors.onAzure : colors.text);
  const fill =
    variant === 'solid' ? colors.azure : variant === 'soft' ? colors.surfaceRaised : 'transparent';

  const t = useSharedValue(on ? 1 : 0);
  const pressed = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(on ? 1 : 0, spring('smooth', reduced)));
  }, [on, reduced, t]);

  const path = useDerivedValue(() => {
    const k = t.get();
    const b = Skia.PathBuilder.Make();
    for (let s = 0; s < glyph.off.length; s++) {
      const a = glyph.off[s]!;
      const z = glyph.on[s]!;
      for (let i = 0; i < a.length; i += 2) {
        const x = (a[i]! + (z[i]! - a[i]!) * k) * unit;
        const y = (a[i + 1]! + (z[i + 1]! - a[i + 1]!) * k) * unit;
        if (i === 0) b.moveTo(x, y);
        else b.lineTo(x, y);
      }
      if (glyph.filled) b.close();
    }
    return b.detach();
  });
  const spin = useDerivedValue(() => [{ rotate: (glyph.turn * t.get() * Math.PI) / 180 }]);

  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.1 }],
  }));

  const toggle = () => {
    const next = !on;
    if (value === undefined) setInner(next);
    haptic('tap');
    onValueChange?.(next);
  };

  const swaps = activeAccessibilityLabel !== undefined;
  const slop = Math.max(0, (minTouchTarget - size) / 2);

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={toggle}
      onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
      hitSlop={slop}
      accessibilityRole={swaps ? 'button' : 'togglebutton'}
      accessibilityLabel={swaps && on ? activeAccessibilityLabel : accessibilityLabel}
      accessibilityState={swaps ? { disabled } : { checked: on, disabled }}
      style={[{ width: size, height: size, opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Animated.View
        style={[
          styles.disc,
          { borderRadius: size / 2, backgroundColor: fill },
          variant === 'soft' && {
            borderColor: colors.border,
            borderWidth: StyleSheet.hairlineWidth,
          },
          shell,
        ]}
      >
        {/* Wrapped: the web canvas ignores pointerEvents and would swallow the press. */}
        <View pointerEvents="none" style={{ width: box, height: box }}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group origin={{ x: box / 2, y: box / 2 }} transform={spin}>
              {glyph.filled ? (
                <>
                  <Path path={path} color={ink} />
                  {/* A thin stroke over the fill rounds the polygon corners. */}
                  <Path
                    path={path}
                    color={ink}
                    style="stroke"
                    strokeWidth={1.6 * unit}
                    strokeJoin="round"
                  />
                </>
              ) : (
                <Path
                  path={path}
                  color={ink}
                  style="stroke"
                  strokeWidth={2 * unit}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}
            </Group>
          </Canvas>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
