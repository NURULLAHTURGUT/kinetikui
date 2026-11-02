import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type TripGlanceProps = {
  /** Trip code in the corner, e.g. "KN81". */
  code: string;
  /** Destination code at the end of the route, e.g. "OSL". */
  destination: string;
  /** Minutes still to go. */
  minutesLeft: number;
  /** How far along the trip is, 0–1. Changes glide the plane along the route. */
  progress: number;
  /** Line under the time, e.g. "Landing early". */
  status?: string;
  /** Bags in the yellow badge. Hidden when not given. */
  bags?: number;
  style?: StyleProp<ViewStyle>;
};

/** Plane from Tabler Icons (MIT, https://tabler.io/icons), nose right on a 24 pt grid. */
const PLANE = Skia.Path.MakeFromSVGString(
  'M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z',
)!;
const ROUTE_H = 44;
const PAD = 8;
const ICON = 26;

/** The route's drop at `x`, both 0–1: level for the first half, then an S-curve down. */
export function routeDrop(x: number): number {
  'worklet';
  const t = Math.max(0, Math.min(1, (x - 0.46) / 0.44));
  return t * t * (3 - 2 * t);
}

/** "2H 56M" as its numbers, or just the minutes under an hour. */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  const whole = Math.max(0, Math.round(total));
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

/**
 * A trip at a glance: a plane flies along a line that curves down to the
 * destination, a white trail behind it and the way ahead in green, while the time
 * left counts down below.
 */
export function TripGlance({
  code,
  destination,
  minutesLeft,
  progress,
  status,
  bags,
  style,
}: TripGlanceProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const { hours, minutes } = splitMinutes(useCountUp(minutesLeft, { instant: reduced }));
  const exact = splitMinutes(minutesLeft);

  const big: TextStyle = {
    color: colors.highlight,
    fontSize: font.size.xl,
    fontWeight: font.weight.semibold,
    fontVariant: ['tabular-nums'],
  };
  const unit = { fontSize: font.size.sm, fontWeight: font.weight.medium } as const;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={[
        `${code} to ${destination}`,
        `${exact.hours} hours ${exact.minutes} minutes left`,
        status,
        bags ? `${bags} ${bags === 1 ? 'bag' : 'bags'}` : null,
      ]
        .filter(Boolean)
        .join('. ')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.card, style]}
    >
      <View style={styles.between}>
        <Text style={{ color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium }}>
          {code}
        </Text>
        {bags ? (
          <View style={[styles.badge, { borderRadius: radius.xs }]}>
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <SvgPath
                d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Zm2 0h2V5h-2v2Z"
                fill={BADGE_INK}
              />
            </Svg>
            <Text
              style={{ color: BADGE_INK, fontSize: font.size.xs, fontWeight: font.weight.bold }}
            >
              {bags}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        testID="trip-glance-route"
        style={styles.route}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? <Route width={width} progress={progress} /> : null}
      </View>

      <View style={styles.foot}>
        <View style={styles.grow}>
          <Text style={big}>
            {hours > 0 ? (
              <>
                {hours}
                <Text style={unit}>H </Text>
              </>
            ) : null}
            {minutes}
            <Text style={unit}>M</Text>
          </Text>
          {status ? (
            <Text
              numberOfLines={1}
              style={{ color: GREEN, fontSize: font.size.xs, fontWeight: font.weight.medium }}
            >
              {status}
            </Text>
          ) : null}
        </View>
        <Text style={big}>{destination}</Text>
      </View>
    </View>
  );
}

function Route({ width, progress }: { width: number; progress: number }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const p = Math.max(0, Math.min(1, progress));
  const span = width - PAD * 2;
  const drop = ROUTE_H - PAD * 2;
  const at = useSharedValue(reduced ? p : 0);

  useEffect(() => {
    at.set(reduced ? p : withSpring(p, spring('smooth')));
  }, [p, reduced, at]);

  const line = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let i = 0; i <= 48; i++) {
      const x = i / 48;
      const px = PAD + x * span;
      const py = PAD + routeDrop(x) * drop;
      if (i === 0) b.moveTo(px, py);
      else b.lineTo(px, py);
    }
    return b.detach();
  }, [span, drop]);

  const behind = useDerivedValue(() => rect(0, 0, PAD + at.get() * span, ROUTE_H));
  const ahead = useDerivedValue(() => {
    const x = PAD + at.get() * span;
    return rect(x, 0, width - x, ROUTE_H);
  });
  const plane = useDerivedValue(() => {
    const u = at.get();
    const slope = ((routeDrop(u + 0.01) - routeDrop(u - 0.01)) / 0.02) * (drop / span);
    return [
      { translateX: PAD + u * span },
      { translateY: PAD + routeDrop(u) * drop },
      { rotate: Math.atan(slope) },
      { scale: ICON / 24 },
      { translateX: -12 },
      { translateY: -12 },
    ];
  });

  return (
    <>
      <Canvas style={{ width, height: ROUTE_H }}>
        <Group clip={behind}>
          <Path path={line} style="stroke" strokeWidth={3} strokeCap="round">
            <LinearGradient
              start={vec(PAD, 0)}
              end={vec(PAD + span * 0.34, 0)}
              colors={[TRAIL_FADE, colors.highlight]}
            />
          </Path>
        </Group>
        <Group clip={ahead}>
          <Path path={line} style="stroke" strokeWidth={8} strokeCap="round" color={GREEN_GLOW} />
          <Path path={line} style="stroke" strokeWidth={3} strokeCap="round" color={GREEN} />
        </Group>
        <Circle cx={PAD + span} cy={PAD + drop} r={4} color={GREEN} />
        <Group transform={plane}>
          <Path path={PLANE} color={colors.highlight} />
        </Group>
      </Canvas>
      {reduced || p >= 1 ? null : <Ripple left={PAD + span} top={PAD + drop} />}
    </>
  );
}

/** A soft ring opening from the destination, cheap to run because only a view moves. */
function Ripple({ left, top }: { left: number; top: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 2200, easing: easings.standard }), -1, false));
  }, [t]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.get()),
    transform: [{ scale: 0.4 + t.get() * 1.6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ripple, { left: left - RIPPLE / 2, top: top - RIPPLE / 2 }, ring]}
    />
  );
}

const RIPPLE = 18;
const MUTED = 'hsl(0, 0%, 62%)';
const GREEN = 'hsl(145, 80%, 50%)';
const GREEN_GLOW = 'hsla(145, 80%, 50%, 0.18)';
const TRAIL_FADE = 'hsla(0, 0%, 100%, 0)';
const BADGE_INK = 'hsl(45, 80%, 10%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
    padding: 16,
  },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'hsl(48, 96%, 58%)',
  },
  route: { height: ROUTE_H, marginVertical: 4 },
  foot: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  grow: { flex: 1 },
  ripple: {
    position: 'absolute',
    width: RIPPLE,
    height: RIPPLE,
    borderRadius: RIPPLE / 2,
    borderWidth: 1.5,
    borderColor: GREEN,
  },
});
