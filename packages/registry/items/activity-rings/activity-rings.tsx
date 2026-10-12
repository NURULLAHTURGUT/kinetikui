import {
  Canvas,
  Circle,
  Group,
  Path,
  Shadow,
  Skia,
  SweepGradient,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type ActivityRing = {
  key: string;
  label: string;
  value: number;
  goal: number;
  /** Ring colour. Defaults to the theme's azure, sky, success and warning in turn. */
  color?: string;
};

export type ActivityRingsProps = {
  /** One to four rings, outermost first. */
  rings: readonly ActivityRing[];
  /** Diameter. Defaults to 180. */
  size?: number;
  /** Width of each ring. Defaults to 18. */
  thickness?: number;
  /** Space between rings. Defaults to 4. */
  gap?: number;
  /** Shown in the middle. */
  center?: ReactNode;
  /** Rows beside the rings; tap one to bring its ring forward. Defaults to true. */
  legend?: boolean;
  /** Formats a ring's value and goal, e.g. "420 / 600 kcal". */
  formatValue?: (ring: ActivityRing) => string;
  /** A tick when a ring is brought forward. Defaults to true. */
  haptics?: boolean;
  /** A summary of what the rings show, e.g. "Today's activity". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Laps a ring can show: past the goal it goes round again, up to twice. */
const MAX_LAPS = 2;

/**
 * Concentric progress rings that wind up one after another. A ring past its
 * goal keeps going round, its second lap casting a shadow on the first, and
 * each ring brightens from its start to its tip.
 */
export function ActivityRings({
  rings,
  size = 180,
  thickness = 18,
  gap = 4,
  center,
  legend = true,
  formatValue = (r) => `${Math.round(r.value)} / ${Math.round(r.goal)}`,
  haptics = true,
  accessibilityLabel,
  style,
}: ActivityRingsProps) {
  const { colors, font, radius, space, scheme } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  // The second lap's shadow falls on the first; it is dark in both schemes.
  const shade = withAlpha(scheme === 'dark' ? colors.background : colors.text, 0.45);
  const [focus, setFocus] = useState<number | null>(null);

  const palette = [colors.azure, colors.sky, colors.success, colors.warning];
  const tint = (r: ActivityRing, i: number) => r.color ?? palette[i % palette.length]!;
  const share = (r: ActivityRing) => (r.goal > 0 ? Math.max(0, r.value) / r.goal : 0);

  // One circle per ring, starting at 3 o'clock; the group turns it to start at 12.
  const circles = useMemo(
    () =>
      rings.map((_, i) => {
        const r = size / 2 - thickness / 2 - i * (thickness + gap);
        return {
          r,
          path: Skia.PathBuilder.Make()
            .addArc({ x: size / 2 - r, y: size / 2 - r, width: r * 2, height: r * 2 }, 0, 359.99)
            .detach(),
        };
      }),
    // Only the geometry matters here, not the values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rings.length, size, thickness, gap],
  );

  const choose = (i: number) => {
    const next = focus === i ? null : i;
    setFocus(next);
    if (next !== null) haptic('tick');
  };

  const pct = (r: ActivityRing) => `${Math.round(share(r) * 100)}%`;

  return (
    <View style={[styles.row, { gap: space[6] }, style]}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}. ${rings
          .map((r) => `${r.label} ${formatValue(r)}, ${pct(r)}`)
          .join('; ')}`}
        style={{ width: size, height: size }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group origin={vec(size / 2, size / 2)} transform={[{ rotate: -Math.PI / 2 }]}>
              {rings.map((ring, i) => (
                <Lap
                  key={ring.key}
                  index={i}
                  size={size}
                  r={circles[i]!.r}
                  path={circles[i]!.path}
                  share={share(ring)}
                  color={tint(ring, i)}
                  thickness={thickness}
                  shade={shade}
                  dimmed={focus !== null && focus !== i}
                  reduced={reduced}
                />
              ))}
            </Group>
          </Canvas>
        </View>
        {center ? (
          <View pointerEvents="none" style={styles.center}>
            <Center reduced={reduced}>{center}</Center>
          </View>
        ) : null}
      </View>

      {legend ? (
        <View style={styles.legend}>
          {rings.map((ring, i) => {
            const on = focus === i;
            return (
              <Pressable
                key={ring.key}
                onPress={() => choose(i)}
                accessibilityRole="button"
                accessibilityLabel={`${ring.label}, ${formatValue(ring)}, ${pct(ring)}`}
                accessibilityState={{ selected: on }}
                style={[
                  styles.entry,
                  {
                    borderRadius: radius.md,
                    paddingHorizontal: space[3],
                    backgroundColor: on ? colors.surfaceRaised : 'transparent',
                    opacity: focus === null || on ? 1 : 0.45,
                  },
                ]}
              >
                <View style={styles.entryTop}>
                  <View style={[styles.dot, { backgroundColor: tint(ring, i) }]} />
                  <Text style={{ color: colors.textMuted, fontSize: font.size.xs, flex: 1 }}>
                    {ring.label}
                  </Text>
                  <Text
                    style={{
                      color: tint(ring, i),
                      fontSize: font.size.xs,
                      fontWeight: font.weight.semibold,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {pct(ring)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.md,
                    fontWeight: font.weight.semibold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatValue(ring)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Lap({
  index,
  size,
  r,
  path,
  share,
  color,
  thickness,
  shade,
  dimmed,
  reduced,
}: {
  index: number;
  size: number;
  r: number;
  path: SkPath;
  share: number;
  color: string;
  thickness: number;
  shade: string;
  dimmed: boolean;
  reduced: boolean;
}) {
  const progress = useSharedValue(reduced ? share : 0);
  const fade = useSharedValue(1);
  const target = Math.min(MAX_LAPS, share);

  useEffect(() => {
    // Rings wind up one after another, the longer ones taking a little longer.
    const to = withTiming(target, {
      duration: 900 + Math.min(1, target) * 500,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
    progress.set(reduced ? target : withDelay(index * 140, to));
  }, [target, index, reduced, progress]);
  useEffect(() => {
    fade.set(withTiming(dimmed ? 0.28 : 1, timing('base', reduced)));
  }, [dimmed, reduced, fade]);

  const first = useDerivedValue(() => Math.min(1, progress.get()));
  const second = useDerivedValue(() => Math.max(0, Math.min(1, progress.get() - 1)));
  const lapped = useDerivedValue(() => (progress.get() > 1 ? 1 : 0));
  const c = vec(size / 2, size / 2);

  return (
    <Group opacity={fade}>
      <Circle c={c} r={r} style="stroke" strokeWidth={thickness} color={withAlpha(color, 0.16)} />
      <Path path={path} style="stroke" strokeWidth={thickness} strokeCap="round" end={first}>
        <SweepGradient c={c} colors={[withAlpha(color, 0.72), color]} />
      </Path>
      <Group opacity={lapped}>
        <Path
          path={path}
          style="stroke"
          strokeWidth={thickness}
          strokeCap="round"
          color={color}
          end={second}
        >
          <Shadow dx={0} dy={0} blur={thickness * 0.3} color={shade} />
        </Path>
      </Group>
    </Group>
  );
}

/** The centre slot, faded in once the rings have started. */
function Center({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    t.set(withDelay(reduced ? 0 : 300, withTiming(1, timing('slow', reduced))));
  }, [reduced, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ scale: 0.92 + t.get() * 0.08 }],
  }));
  return <Animated.View style={[styles.centerInner, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  centerInner: { alignItems: 'center' },
  legend: { gap: 2, minWidth: 160, flexGrow: 1, flexBasis: 160 },
  entry: { minHeight: minTouchTarget, paddingVertical: 6, justifyContent: 'center', gap: 2 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
