import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextProps,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { palettes, withAlpha } from '../../shared/tokens/tokens';

export type VitalMetric = {
  /** Shown before the value. */
  icon?: ReactNode;
  value: string;
  label: string;
  /** A small change beside the value, e.g. "12%". */
  change?: { text: string; up: boolean };
};

export type VitalRing = {
  /** 0–100: how far round the arc reaches. Shown in the badge at its tip. */
  value: number;
  /** Arc colour. Defaults to sky, green and red, outside in. */
  color?: string;
  /** Read out by screen readers, e.g. "Activity". */
  label?: string;
};

export type VitalArcsProps = {
  title: string;
  /** Up to three rows on the left. */
  metrics: readonly VitalMetric[];
  /** Up to three arcs, outermost first. */
  rings: readonly VitalRing[];
  /** The figure in the disc at the arcs' centre. */
  score: number;
  /** Word under the score, e.g. "PAI". */
  scoreLabel: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 204;
const THICK = 18;
const GAP = 6;
const DISC = 100;
/** The arcs start pointing straight down, below the card, and sweep clockwise over the top. */
const START = 93;
const SWEEP = 200;
/** Degrees every arc shows even at 0, so the tips clear the card's bottom edge. */
const BASE = 64;

/**
 * A daily summary widget: a few figures on the left and, rising from the
 * corner, concentric arcs that sweep round one after another, each carrying
 * its value in a badge at the tip, around a disc whose score counts up.
 */
export function VitalArcs({ title, metrics, rings, score, scoreLabel, style }: VitalArcsProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const tones = [colors.sky, colors.success, colors.danger];
  const list = rings.slice(0, 3);

  // The arcs' centre sits near the bottom-right corner; narrow cards shrink them.
  const scale = width > 0 ? Math.min(1, (width * 0.42) / 188) : 1;
  // Low enough that every arc starts below the card's bottom edge, as if rising from it.
  const cx = width - 50 * scale;
  const cy = HEIGHT - 54 * scale;
  const radii = list.map(
    (_, i) => (DISC / 2 + GAP + THICK / 2 + (list.length - 1 - i) * (THICK + GAP)) * scale,
  );

  const disc = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    disc.set(reduced ? 1 : withDelay(200, withSpring(1, spring('bouncy'))));
  }, [score, reduced, disc]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + disc.get() * 0.4 }] }));

  const summary = list
    .map((r, i) => `${r.label ?? `Ring ${i + 1}`} ${Math.round(r.value)}`)
    .join(', ');

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.xl + 8,
          boxShadow: shadow.lg,
        },
        style,
      ]}
    >
      {width > 0 ? (
        <View
          accessible
          accessibilityLabel={`${score} ${scoreLabel}. ${summary}`}
          style={StyleSheet.absoluteFill}
        >
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {list.map((ring, i) => (
              <Arc
                key={i}
                cx={cx}
                cy={cy}
                r={radii[i]!}
                thick={THICK * scale}
                value={ring.value}
                order={i}
                color={ring.color ?? tones[i]!}
                track={withAlpha(colors.text, 0.05)}
              />
            ))}
          </Canvas>
          {list.map((ring, i) => (
            <Badge
              key={i}
              cx={cx}
              cy={cy}
              r={radii[i]!}
              value={ring.value}
              order={i}
              color={ring.color ?? tones[i]!}
              size={Math.max(20, 26 * scale)}
            />
          ))}
          <Animated.View
            style={[
              styles.disc,
              {
                width: DISC * scale,
                height: DISC * scale,
                borderRadius: (DISC * scale) / 2,
                left: cx - (DISC * scale) / 2,
                top: cy - (DISC * scale) / 2,
                backgroundColor: colors.ember,
                boxShadow: shadow.lg,
              },
              pop,
            ]}
          >
            <Counted
              value={score}
              duration={1100}
              format={(n) => String(Math.round(n))}
              style={{
                color: colors.onEmber,
                fontSize: 34 * scale,
                lineHeight: 38 * scale,
                fontWeight: font.weight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            />
            <Text
              style={{
                color: colors.onEmber,
                fontSize: 15 * scale,
                fontWeight: font.weight.bold,
                letterSpacing: 0.5,
              }}
            >
              {scoreLabel}
            </Text>
          </Animated.View>
        </View>
      ) : null}

      <View style={{ padding: space[6], paddingRight: 0, gap: space[5], maxWidth: '55%' }}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            color: colors.text,
            fontSize: font.size.xl,
            fontWeight: font.weight.semibold,
            letterSpacing: font.tracking.tight,
          }}
        >
          {title}
        </Text>
        <View style={{ gap: space[4] }}>
          {metrics.slice(0, 3).map((m, i) => (
            <Metric key={m.label} metric={m} order={i} />
          ))}
        </View>
      </View>
    </View>
  );
}

function arcPath(cx: number, cy: number, r: number): SkPath {
  return Skia.PathBuilder.Make()
    .addArc(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), START, SWEEP)
    .detach();
}

/** One arc: a faint full-length track, and the value sweeping along it. */
function Arc({
  cx,
  cy,
  r,
  thick,
  value,
  order,
  color,
  track,
}: {
  cx: number;
  cy: number;
  r: number;
  thick: number;
  value: number;
  order: number;
  color: string;
  track: string;
}) {
  const reduced = useReduceMotion();
  const path = useMemo(() => arcPath(cx, cy, r), [cx, cy, r]);
  const reach = useArcProgress(value, order, reduced);
  const end = useDerivedValue(() => Math.max(0.001, reach.get()));
  return (
    <>
      <Path path={path} style="stroke" strokeWidth={thick} strokeCap="round" color={track} />
      <Path
        path={path}
        style="stroke"
        strokeWidth={thick}
        strokeCap="round"
        color={color}
        start={0}
        end={end}
      />
    </>
  );
}

/** Share of the arc filled, sweeping to `value` a beat after the arc outside it. */
function useArcProgress(value: number, order: number, reduced: boolean): SharedValue<number> {
  const share = Math.max(0, Math.min(1, value / 100));
  const target = (BASE + share * (SWEEP - BASE)) / SWEEP;
  const reach = useSharedValue(reduced ? target : 0);
  useEffect(() => {
    reach.set(
      reduced
        ? target
        : withDelay(
            order * 140,
            withTiming(target, { duration: 1100, easing: Easing.out(Easing.cubic) }),
          ),
    );
  }, [target, order, reduced, reach]);
  return reach;
}

/** The value riding at the tip of its arc. */
function Badge({
  cx,
  cy,
  r,
  value,
  order,
  color,
  size,
}: {
  cx: number;
  cy: number;
  r: number;
  value: number;
  order: number;
  color: string;
  size: number;
}) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const reach = useArcProgress(value, order, reduced);
  const style = useAnimatedStyle(() => {
    const a = ((START + SWEEP * Math.max(0.001, reach.get())) * Math.PI) / 180;
    return {
      opacity: reach.get() > 0.01 ? 1 : 0,
      transform: [
        { translateX: cx + Math.cos(a) * r - size / 2 },
        { translateY: cy + Math.sin(a) * r - size / 2 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: withAlpha(colors.highlight, 0.5),
        },
        style,
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: withAlpha(colors.highlight, 0.4) },
        ]}
      />
      <Text
        style={{
          // Dark ink on the light badge, on either theme.
          color: palettes.light.text,
          fontSize: size * 0.42,
          fontWeight: font.weight.bold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {Math.round(value)}
      </Text>
    </Animated.View>
  );
}

function Metric({ metric, order }: { metric: VitalMetric; order: number }) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) enter.set(withDelay(120 + order * 110, withSpring(1, spring('smooth'))));
  }, [order, reduced, enter]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateX: (1 - enter.get()) * -14 }],
  }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${metric.label}: ${metric.value}${
        metric.change ? `, ${metric.change.up ? 'up' : 'down'} ${metric.change.text}` : ''
      }`}
      style={[styles.metric, style]}
    >
      {metric.icon ? <View style={styles.icon}>{metric.icon}</View> : null}
      <View style={styles.grow}>
        <View style={styles.valueRow}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: font.size.lg + 2 }}>
            {metric.value}
          </Text>
          {metric.change ? (
            <Text
              style={{
                color: metric.change.up ? colors.success : colors.danger,
                fontSize: font.size.xs + 1,
                fontWeight: font.weight.semibold,
                marginLeft: 6,
                marginTop: 2,
              }}
            >
              {metric.change.text}
              {metric.change.up ? '↑' : '↓'}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
          {metric.label}
        </Text>
      </View>
    </Animated.View>
  );
}

/** A figure counting up, in its own component so each count re-renders only this text. */
function Counted({
  value,
  duration,
  format,
  ...text
}: TextProps & { value: number; duration: number; format: (n: number) => string }) {
  const reduced = useReduceMotion();
  const shown = useCountUp(value, { instant: reduced, duration });
  return <Text {...text}>{format(shown)}</Text>;
}

const styles = StyleSheet.create({
  card: { height: HEIGHT, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  disc: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 30, alignItems: 'center' },
  grow: { flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-start' },
});
