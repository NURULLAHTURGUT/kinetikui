import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, palettes } from '../../shared/tokens/tokens';

export type Swatch = {
  /** Any colour React Native accepts; `#RRGGBB` also picks a readable check colour. */
  value: string;
  /** Read by screen readers, e.g. "Sage". */
  label: string;
};

export type SwatchPickerProps = {
  swatches: readonly Swatch[];
  value: string;
  onValueChange: (value: string) => void;
  /** Names the group, e.g. "Accent colour". */
  accessibilityLabel: string;
  /** Diameter of each swatch. Defaults to 32. */
  size?: number;
  /** A tick when the colour changes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const CELL = minTouchTarget;
const GAP = 3;
const RING = 2;

/** True when dark ink reads better than light ink on the colour. */
export function isLight(color: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m?.[1]) return false;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.4;
}

/**
 * A row of colour swatches. A ring in the chosen colour glides from swatch
 * to swatch, the swatch under it gives a small squeeze, and a check pops in
 * whose ink is picked to stay readable on that colour.
 */
export function SwatchPicker({
  swatches,
  value,
  onValueChange,
  accessibilityLabel,
  size = 32,
  haptics = true,
  testID,
  style,
}: SwatchPickerProps) {
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [spots, setSpots] = useState<Record<string, { x: number; y: number }>>({});
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const placed = useRef(false);
  const spot = spots[value];
  const ring = size + (GAP + RING) * 2;

  useEffect(() => {
    if (!spot) return;
    const snap = reduced || !placed.current;
    placed.current = true;
    x.set(snap ? spot.x : withSpring(spot.x, spring('smooth')));
    y.set(snap ? spot.y : withSpring(spot.y, spring('smooth')));
  }, [spot, reduced, x, y]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: spot ? 1 : 0,
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }));

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrap, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            borderColor: value,
            left: (CELL - ring) / 2,
            top: (CELL - ring) / 2,
          },
          ringStyle,
        ]}
      />
      {swatches.map((s) => (
        <Dot
          key={s.value}
          swatch={s}
          size={size}
          selected={s.value === value}
          reduced={reduced}
          onPress={() => {
            if (s.value === value) return;
            haptic('tick');
            onValueChange(s.value);
          }}
          onPlace={(px, py) =>
            setSpots((m) => {
              const prev = m[s.value];
              return prev && prev.x === px && prev.y === py
                ? m
                : { ...m, [s.value]: { x: px, y: py } };
            })
          }
        />
      ))}
    </View>
  );
}

type DotProps = {
  swatch: Swatch;
  size: number;
  selected: boolean;
  reduced: boolean;
  onPress: () => void;
  onPlace: (x: number, y: number) => void;
};

function Dot({ swatch, size, selected, reduced, onPress, onPlace }: DotProps) {
  const { colors } = useKinetikTheme();
  const on = useSharedValue(selected ? 1 : 0);
  const squeeze = useSharedValue(1);
  useEffect(() => {
    on.set(withSpring(selected ? 1 : 0, spring('bouncy', reduced)));
    if (selected && !reduced) {
      squeeze.set(
        withSequence(withTiming(0.86, { duration: 90 }), withSpring(1, spring('bouncy'))),
      );
    }
  }, [selected, reduced, on, squeeze]);

  const body = useAnimatedStyle(() => ({ transform: [{ scale: squeeze.get() }] }));
  const check = useAnimatedStyle(() => ({
    opacity: Math.min(1, on.get() * 1.5),
    transform: [{ scale: 0.4 + on.get() * 0.6 }, { rotate: '-45deg' }],
  }));
  const ink = isLight(swatch.value) ? palettes.light.text : palettes.dark.text;

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => onPlace(e.nativeEvent.layout.x, e.nativeEvent.layout.y)}
      accessibilityRole="radio"
      accessibilityLabel={swatch.label}
      accessibilityState={{ checked: selected }}
      style={styles.cell}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: swatch.value,
            borderColor: colors.border,
          },
          body,
        ]}
      >
        <Animated.View
          style={[
            styles.check,
            { borderColor: ink, width: size * 0.42, height: size * 0.24 },
            check,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  ring: { position: 'absolute', borderWidth: RING },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  dot: { borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  check: { borderLeftWidth: 2.2, borderBottomWidth: 2.2, marginTop: -2 },
});
