import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { glow, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type RouteStop = {
  /** Short code, e.g. "IST". */
  code: string;
  /** Place under the code, e.g. "ISTANBUL". */
  city: string;
  /** Time as shown, e.g. "09:40AM". */
  time: string;
};

export type RouteCardProps = {
  from: RouteStop;
  to: RouteStop;
  /** How far along the trip is, 0–1. Changes glide the plane along the line. */
  progress: number;
  /** Status between the cities, e.g. "ON SCHEDULE". */
  status?: string;
  /** Chip in the corner, e.g. the flight number. */
  tag?: string;
  /** Label before the departure time. Defaults to "BOARDS:". */
  departLabel?: string;
  /** Label before the arrival time. Defaults to "LANDS:". */
  arriveLabel?: string;
  /** Mark in the far corner, usually your logo. Defaults to a small star; null hides it. */
  mark?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Plane from Tabler Icons (MIT, https://tabler.io/icons), nose right on a 24 pt grid. */
const PLANE = Skia.Path.MakeFromSVGString(
  'M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z',
)!;
const STAR = Skia.Path.MakeFromSVGString(
  'M12 1L14.6 9.4L23 12L14.6 14.6L12 23L9.4 14.6L1 12L9.4 9.4Z',
)!;

const ICON = 28;
const BAR = 5;
const DASHES = 32;
const TILT = 0.34;
const SPIN = 0.05;

/** Rough land masses as [latitude, longitude, reach north-south, reach east-west], in degrees. */
const LAND: readonly (readonly [number, number, number, number])[] = [
  [50, -100, 22, 30],
  [30, -95, 12, 16],
  [14, -88, 8, 8],
  [-14, -60, 20, 15],
  [-36, -67, 14, 7],
  [72, -40, 10, 16],
  [50, 12, 14, 22],
  [62, 22, 9, 16],
  [14, 18, 22, 26],
  [-14, 25, 16, 13],
  [28, 48, 12, 12],
  [55, 90, 16, 54],
  [33, 100, 16, 24],
  [20, 79, 12, 8],
  [38, 138, 8, 5],
  [0, 112, 8, 14],
  [-25, 134, 11, 16],
];

function isLand(lat: number, lon: number) {
  return LAND.some(([la, lo, rLa, rLo]) => {
    const dLon = ((lon - lo + 540) % 360) - 180;
    return ((lat - la) / rLa) ** 2 + (dLon / rLo) ** 2 < 1;
  });
}

/** Evenly spread points on the land of a unit sphere, north of 25°S: the rest never shows. */
function landDots(count: number): number[] {
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2;
    const lat = (Math.asin(y) * 180) / Math.PI;
    if (lat < -25) continue;
    const angle = i * golden;
    const lon = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
    if (!isLand(lat, lon - 180)) continue;
    const r = Math.cos(Math.asin(y));
    out.push(r * Math.cos(angle), y, r * Math.sin(angle));
  }
  return out;
}

const DOTS = landDots(2600);

/**
 * A trip card: two big codes joined by a line that fills in green behind a
 * small plane, dashed for the distance still to go, above a slowly turning
 * globe of dots rising from the bottom edge.
 */
export function RouteCard({
  from,
  to,
  progress,
  status,
  tag,
  departLabel = 'BOARDS:',
  arriveLabel = 'LANDS:',
  mark,
  style,
}: RouteCardProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [track, setTrack] = useState(0);
  const p = Math.max(0, Math.min(1, progress));
  const compact = width > 0 && width < 340;
  const pct = Math.round(p * 100);

  const at = useSharedValue(reduced ? p : 0);
  useEffect(() => {
    at.set(reduced ? p : withSpring(p, spring('smooth')));
  }, [p, reduced, at]);

  const fill = useAnimatedStyle(() => ({ width: at.get() * track }));
  const plane = useAnimatedStyle(() => ({
    transform: [{ translateX: at.get() * track - ICON / 2 }],
  }));
  const rest = useAnimatedStyle(() => ({ left: at.get() * track + ICON / 2 }));

  const code = {
    color: colors.highlight,
    fontSize: compact ? font.size['2xl'] : font.size['3xl'],
    fontWeight: font.weight.bold,
    letterSpacing: font.tracking.tight,
  } as const;
  const small = { color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium } as const;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        `${from.code}, ${from.city}, to ${to.code}, ${to.city}. ` +
        `${departLabel} ${from.time}, ${arriveLabel} ${to.time}.` +
        `${status ? ` ${status}.` : ''}${tag ? ` ${tag}.` : ''}`
      }
      accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct}% of the way` }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, gradient(BACKDROP), style]}
    >
      {width > 0 ? <Globe width={width} reduced={reduced} /> : null}

      <View style={{ padding: space[5], gap: space[2] }}>
        <View style={styles.between}>
          <Text numberOfLines={1} style={small}>
            {departLabel} {from.time}
          </Text>
          <Text numberOfLines={1} style={small}>
            {arriveLabel} {to.time}
          </Text>
        </View>

        <View style={[styles.line, { gap: space[3] }]}>
          <Text style={code}>{from.code}</Text>
          <View
            style={styles.route}
            onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
            pointerEvents="none"
          >
            <Animated.View style={[styles.rest, rest]}>
              {Array.from({ length: DASHES }, (_, i) => (
                <View
                  key={i}
                  style={[styles.dash, { backgroundColor: withAlpha(colors.highlight, 0.6) }]}
                />
              ))}
            </Animated.View>
            <Animated.View
              style={[styles.fill, gradient(LINE), { boxShadow: glow(GREEN) }, fill]}
            />
            <Animated.View style={[styles.plane, plane]}>
              <Canvas style={styles.planeBox}>
                <Group transform={[{ scale: ICON / 24 }]}>
                  <Path path={PLANE} color={colors.highlight} />
                </Group>
              </Canvas>
            </Animated.View>
          </View>
          <Text style={code}>{to.code}</Text>
        </View>

        <View style={styles.between}>
          <Text numberOfLines={1} style={[small, styles.side]}>
            {from.city}
          </Text>
          {status ? (
            <Text
              numberOfLines={1}
              style={{ color: GREEN, fontSize: font.size.xs + 1, fontWeight: font.weight.bold }}
            >
              {status}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={[small, styles.side, styles.right]}>
            {to.city}
          </Text>
        </View>

        <View style={[styles.between, styles.foot, { marginTop: space[6] }]}>
          {tag ? (
            <View style={[styles.chip, { borderRadius: radius.sm }]}>
              <Text
                style={{
                  color: colors.highlight,
                  fontSize: font.size.xs + 1,
                  fontWeight: font.weight.semibold,
                }}
              >
                {tag}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {mark === undefined ? (
            <Canvas style={styles.mark}>
              <Group transform={[{ scale: MARK / 24 }]}>
                <Path path={STAR} color={colors.danger} />
              </Group>
            </Canvas>
          ) : (
            mark
          )}
        </View>
      </View>
    </View>
  );
}

/** A dark sphere rising from the bottom edge, its land drawn in dots, turning slowly. */
function Globe({ width, reduced }: { width: number; reduced: boolean }) {
  const { colors } = useKinetikTheme();
  const clock = useShaderClock({ running: !reduced, frameRate: 30, start: 40 });
  const height = Math.round(width * 0.2);
  const r = width * 0.4;
  const cx = width / 2;
  const cy = r + 6;

  const dots = useDerivedValue(() => {
    const path = Skia.PathBuilder.Make();
    const angle = clock.get() * SPIN;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);
    for (let i = 0; i < DOTS.length; i += 3) {
      const x0 = DOTS[i]!;
      const y0 = DOTS[i + 1]!;
      const z0 = DOTS[i + 2]!;
      const x = x0 * cosA + z0 * sinA;
      const z1 = z0 * cosA - x0 * sinA;
      const y = y0 * cosT - z1 * sinT;
      const z = z1 * cosT + y0 * sinT;
      if (z < 0.05) continue;
      const sy = cy - y * r;
      if (sy > height) continue;
      path.addCircle(cx + x * r, sy, 0.45 + z * 0.75);
    }
    return path.detach();
  });

  return (
    <Canvas style={{ ...styles.globe, height }} pointerEvents="none">
      <Circle cx={cx} cy={cy} r={r + 4} color={HAZE}>
        <BlurMask blur={22} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={r} color={SPHERE} />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        color={withAlpha(colors.highlight, 0.14)}
        style="stroke"
        strokeWidth={1}
      />
      <Path path={dots} color={withAlpha(colors.highlight, 0.82)} />
    </Canvas>
  );
}

const MARK = 26;
const MUTED = 'hsl(220, 6%, 60%)';
const GREEN = 'hsl(145, 76%, 46%)';
const HAZE = 'hsl(212, 26%, 26%)';
const SPHERE = 'hsl(220, 12%, 5%)';
const BACKDROP = 'linear-gradient(180deg, hsl(220, 8%, 10%) 0%, hsl(218, 10%, 6%) 100%)';
const LINE = 'linear-gradient(90deg, hsl(145, 70%, 24%) 0%, hsl(145, 76%, 46%) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 30,
    overflow: 'hidden',
    boxShadow: '0px 18px 40px hsla(220, 30%, 5%, 0.3)',
  },
  globe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center' },
  route: { flex: 1, height: ICON, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: BAR, borderRadius: BAR / 2 },
  rest: {
    position: 'absolute',
    right: 0,
    height: 2,
    flexDirection: 'row',
    gap: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dash: { width: 5, height: 2, borderRadius: 1 },
  plane: { position: 'absolute', left: 0, width: ICON, height: ICON },
  planeBox: { width: ICON, height: ICON },
  side: { flex: 1 },
  right: { textAlign: 'right' },
  foot: { alignItems: 'flex-end' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'hsl(214, 16%, 22%)',
  },
  mark: { width: MARK, height: MARK },
});
