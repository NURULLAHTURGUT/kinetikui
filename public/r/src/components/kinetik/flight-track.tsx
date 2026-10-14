import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { glow } from '../../lib/kinetik/tokens/tokens';

export type FlightStop = {
  /** Airport code, e.g. "LHR". */
  code: string;
  /** Place under the code, e.g. "London, UK". */
  city: string;
  /** Local time, e.g. "20:50". */
  time: string;
  /** Time zone tag, e.g. "GMT+1". */
  zone?: string;
};

export type FlightTrackProps = {
  from: FlightStop;
  to: FlightStop;
  /** How far along the flight is, 0–1. Changes glide the plane along the route. */
  progress: number;
  /** Label before the departure time. Defaults to "DEP". */
  departLabel?: string;
  /** Label before the arrival time. Defaults to "ETA". */
  arriveLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Plane from Tabler Icons (MIT, https://tabler.io/icons), nose right on a 24 pt grid. */
const PLANE = Skia.Path.MakeFromSVGString(
  'M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z',
)!;

const ICON = 30;
/** Fit the plane, wing tips included, in the box. */
const SCALE = (ICON / 24) * 0.84;
const BAR = 6;

/**
 * A boarding-pass style flight card: departure and arrival codes with their
 * times, and a route between them that fills with a glowing line behind a
 * small plane. The plane glides to each new position, its wing-tip lights
 * blink red and green, and the distance still to fly is hatched.
 */
export function FlightTrack({
  from,
  to,
  progress,
  departLabel = 'DEP',
  arriveLabel = 'ETA',
  style,
}: FlightTrackProps) {
  const { colors, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [track, setTrack] = useState(0);
  const p = Math.max(0, Math.min(1, progress));
  const compact = width > 0 && width < 460;

  const at = useSharedValue(reduced ? p : 0);
  useEffect(() => {
    at.set(reduced ? p : withSpring(p, spring('smooth')));
  }, [p, reduced, at]);

  const fill = useAnimatedStyle(() => ({ width: Math.max(BAR, at.get() * track) }));
  const plane = useAnimatedStyle(() => ({
    transform: [{ translateX: at.get() * track - ICON / 2 }],
  }));
  const rest = useAnimatedStyle(() => ({ left: at.get() * track }));

  const pct = Math.round(p * 100);
  const summary =
    `${from.code}, ${from.city}, to ${to.code}, ${to.city}. ` +
    `${departLabel === 'DEP' ? 'Departs' : departLabel} ${from.time}${from.zone ? ` ${from.zone}` : ''}, ` +
    `${arriveLabel === 'ETA' ? 'arrives' : arriveLabel} ${to.time}${to.zone ? ` ${to.zone}` : ''}.`;

  const route = (
    <View
      style={styles.route}
      onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
      pointerEvents="none"
    >
      <Animated.View style={[styles.rest, rest]}>
        <Hatch />
      </Animated.View>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: colors.highlight, boxShadow: glow(colors.highlight) },
          fill,
        ]}
      />
      <Animated.View style={[styles.plane, plane]}>
        <Plane landed={p >= 1} />
      </Animated.View>
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={summary}
      accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct}% of the way` }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.shell,
        {
          borderColor: colors.borderStrong,
          borderRadius: radius.xl + 6,
          backgroundColor: colors.background,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
            padding: compact ? space[4] : space[6],
            gap: compact ? space[4] : 0,
          },
        ]}
      >
        {compact ? (
          <>
            <View style={[styles.row, { gap: space[3] }]}>
              <Airport stop={from} />
              <View style={styles.grow}>{route}</View>
              <Airport stop={to} />
            </View>
            <View style={[styles.row, styles.between, { gap: space[2] }]}>
              <TimeChip label={departLabel} stop={from} />
              <TimeChip label={arriveLabel} stop={to} />
            </View>
          </>
        ) : (
          <View style={[styles.row, { gap: space[5] }]}>
            <View style={[styles.end, { gap: space[3] }]}>
              <Airport stop={from} />
              <TimeChip label={departLabel} stop={from} />
            </View>
            <View style={styles.grow}>{route}</View>
            <View style={[styles.end, { gap: space[3] }]}>
              <Airport stop={to} />
              <TimeChip label={arriveLabel} stop={to} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function Airport({ stop }: { stop: FlightStop }) {
  const { colors, font } = useKinetikTheme();
  return (
    <View style={styles.airport}>
      <Text
        style={{
          color: colors.text,
          fontSize: font.size['2xl'],
          fontWeight: font.weight.medium,
          letterSpacing: font.tracking.tight,
        }}
      >
        {stop.code}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 11 }}>
        {stop.city}
      </Text>
    </View>
  );
}

function TimeChip({ label, stop }: { label: string; stop: FlightStop }) {
  const { colors, font, radius, space } = useKinetikTheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.sm,
          gap: space[1.5],
          paddingLeft: space[2],
          paddingRight: stop.zone ? 4 : space[2],
        },
      ]}
    >
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: font.size.md,
          fontWeight: font.weight.medium,
          fontVariant: ['tabular-nums'],
        }}
      >
        {stop.time}
      </Text>
      {stop.zone ? (
        <View style={[styles.zone, { backgroundColor: colors.surface, borderRadius: radius.xs }]}>
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>{stop.zone}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Diagonal stripes for the distance still to fly. */
function Hatch() {
  const { colors } = useKinetikTheme();
  return (
    <View style={styles.hatch}>
      {Array.from({ length: 48 }, (_, i) => (
        <View key={i} style={[styles.stripe, { backgroundColor: colors.textSubtle }]} />
      ))}
    </View>
  );
}

/** The plane, rocking a little in the air, with blinking wing-tip lights. */
function Plane({ landed }: { landed: boolean }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const red = useSharedValue(1);
  const green = useSharedValue(1);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduced || landed) {
      red.set(1);
      green.set(1);
      bob.set(0);
      return;
    }
    // Navigation lights: mostly on, with a quick dip, out of step with each other.
    const blink = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.15, { duration: 120 }),
        withTiming(1, { duration: 180 }),
      ),
      -1,
    );
    red.set(blink);
    green.set(withDelay(600, blink));
    bob.set(
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [reduced, landed, red, green, bob]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: (bob.get() - 0.5) * 2 }, { rotate: `${(bob.get() - 0.5) * 3}deg` }],
  }));
  const redStyle = useAnimatedStyle(() => ({ opacity: red.get() }));
  const greenStyle = useAnimatedStyle(() => ({ opacity: green.get() }));

  return (
    <Animated.View style={[styles.planeBox, body]}>
      <Canvas style={styles.planeBox}>
        <Group
          transform={[
            { translateX: ICON / 2 },
            { translateY: ICON / 2 },
            { scale: SCALE },
            { translateX: -12 },
            { translateY: -12 },
          ]}
        >
          <Path path={PLANE} color={colors.textSubtle} />
          <Path path={PLANE} color={colors.border} style="stroke" strokeWidth={0.8} />
        </Group>
      </Canvas>
      <Animated.View
        style={[
          styles.light,
          styles.lightTop,
          { backgroundColor: colors.danger, boxShadow: glow(colors.danger, 'strong') },
          redStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.light,
          styles.lightBottom,
          { backgroundColor: colors.success, boxShadow: glow(colors.success, 'strong') },
          greenStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { borderWidth: 1, padding: 5 },
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  end: { alignItems: 'center' },
  grow: { flex: 1 },
  airport: { alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
  },
  zone: { paddingHorizontal: 6, paddingVertical: 3 },
  route: { height: ICON, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: BAR, borderRadius: BAR / 2 },
  rest: {
    position: 'absolute',
    right: 0,
    height: BAR + 2,
    borderRadius: (BAR + 2) / 2,
    overflow: 'hidden',
    opacity: 0.55,
  },
  hatch: { flexDirection: 'row', gap: 4, marginLeft: -6, marginTop: -6 },
  stripe: { width: 3, height: 20, transform: [{ rotate: '35deg' }] },
  plane: { position: 'absolute', left: 0, width: ICON, height: ICON },
  planeBox: { width: ICON, height: ICON },
  light: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  // Wing tips of the turned plane.
  lightTop: { left: ICON * 0.43 - 2, top: ICON * 0.16 - 2 },
  lightBottom: { left: ICON * 0.46 - 2, top: ICON * 0.83 - 2 },
});
