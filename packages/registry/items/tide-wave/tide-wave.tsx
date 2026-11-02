import {
  BlurMask,
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
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type TidePoint = {
  /** Hour of the day, 0–24. */
  hour: number;
  /** Water height at that high or low tide. */
  height: number;
};

export type TideWaveProps = {
  /** The day's high and low tides in time order. */
  tides: TidePoint[];
  /** The hour now, 0–24. */
  now: number;
  /** Unit after the height. Defaults to "′" (feet). */
  unit?: string;
  style?: StyleProp<ViewStyle>;
};

const H = 70;
const SIDE = 6;
const HOURS = ['00', '06', '12', '18'];
const SAMPLES = 72;

/** Water height at an hour, eased between tides with a cosine as real tides roughly are. */
export function tideAt(hour: number, tides: TidePoint[]): number {
  'worklet';
  const first = tides[0];
  if (!first) return 0;
  if (hour <= first.hour) return first.height;
  for (let i = 1; i < tides.length; i++) {
    const a = tides[i - 1]!;
    const b = tides[i]!;
    if (hour <= b.hour) {
      const t = (hour - a.hour) / Math.max(0.001, b.hour - a.hour);
      return a.height + ((b.height - a.height) * (1 - Math.cos(Math.PI * t))) / 2;
    }
  }
  return tides[tides.length - 1]!.height;
}

/** Whether the water is going down at an hour. */
export function isFalling(hour: number, tides: TidePoint[]): boolean {
  return tideAt(hour + 0.05, tides) < tideAt(hour, tides);
}

/**
 * The day's tide as a soft blue swell: the water draws in from the left, drop lines
 * mark each high and low, and a glowing dot breathes at the height right now.
 */
export function TideWave({ tides, now, unit = '′', style }: TideWaveProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const height = tideAt(now, tides);
  const shown = useCountUp(height, { instant: reduced });
  const falling = isFalling(now, tides);

  return (
    <View
      accessible
      accessibilityLabel={`Tide ${height.toFixed(1)} feet and ${falling ? 'falling' : 'rising'}`}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {shown.toFixed(1)}
          {unit}
        </Text>
        <View style={styles.status}>
          <Text
            style={{ color: BLUE, fontSize: font.size.xs + 1, fontWeight: font.weight.semibold }}
          >
            Tide {falling ? 'Falling' : 'Rising'}
          </Text>
          <View style={[styles.arrow, falling ? null : styles.flip]}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
              <SvgPath
                d="M12 4v14M6 12l6 6 6-6"
                stroke={colors.highlight}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        </View>
      </View>

      <View
        testID="tide-wave-chart"
        style={styles.chart}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? <Swell width={width} tides={tides} now={now} /> : null}
      </View>

      <View style={styles.hours}>
        {HOURS.map((hour) => (
          <Text key={hour} style={{ color: MUTED, fontSize: font.size.xs - 2 }}>
            {hour}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Swell({ width, tides, now }: { width: number; tides: TidePoint[]; now: number }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const span = width - SIDE * 2;
  const top = Math.max(...tides.map((t) => t.height), 1);
  const low = Math.min(...tides.map((t) => t.height), 0);
  const scale = (H - 16) / Math.max(0.001, top - low);
  const xOf = (hour: number) => SIDE + (hour / 24) * span;
  const yOf = (height: number) => H - 2 - (height - low) * scale;

  const { line, area, drops } = useMemo(() => {
    const curve = Skia.PathBuilder.Make();
    const fill = Skia.PathBuilder.Make();
    for (let i = 0; i <= SAMPLES; i++) {
      const hour = (i / SAMPLES) * 24;
      const x = xOf(hour);
      const y = yOf(tideAt(hour, tides));
      if (i === 0) {
        curve.moveTo(x, y);
        fill.moveTo(x, H);
        fill.lineTo(x, y);
      } else {
        curve.lineTo(x, y);
        fill.lineTo(x, y);
      }
    }
    fill.lineTo(xOf(24), H);
    fill.close();
    const marks = Skia.PathBuilder.Make();
    for (const tide of tides) {
      marks.moveTo(xOf(tide.hour), yOf(tide.height));
      marks.lineTo(xOf(tide.hour), H);
    }
    return { line: curve.detach(), area: fill.detach(), drops: marks.detach() };
    // xOf and yOf only depend on these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tides, span, top, low]);

  const reveal = useSharedValue(reduced ? 1 : 0);
  const at = useSharedValue(reduced ? now : (tides[0]?.hour ?? 0));

  useEffect(() => {
    if (!reduced) reveal.set(withTiming(1, { duration: 900, easing: easings.standard }));
  }, [reduced, reveal]);
  useEffect(() => {
    at.set(reduced ? now : withSpring(now, spring('smooth')));
  }, [now, reduced, at]);

  const clip = useDerivedValue(() => rect(0, 0, width * reveal.get(), H));
  const dot = useDerivedValue(() => {
    const hour = at.get();
    return [
      { translateX: SIDE + (hour / 24) * span },
      { translateY: H - 2 - (tideAt(hour, tides) - low) * scale },
    ];
  });

  // The breathing halo is a view, so only the arrival redraws the canvas.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    breath.set(withRepeat(withTiming(1, { duration: 1800, easing: easings.inOut }), -1, true));
  }, [reduced, breath]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.12 + breath.get() * 0.2,
    transform: [
      { translateX: SIDE + (at.get() / 24) * span - HALO / 2 },
      { translateY: H - 2 - (tideAt(at.get(), tides) - low) * scale - HALO / 2 },
      { scale: 0.7 + breath.get() * 0.35 },
    ],
  }));

  return (
    <>
      <Canvas style={{ width, height: H }}>
        <Group clip={clip}>
          <Path path={area}>
            <LinearGradient start={vec(0, 8)} end={vec(0, H)} colors={[WATER_TOP, WATER_LOW]} />
          </Path>
          <Path path={drops} style="stroke" strokeWidth={1} color={DROP} />
          <Path path={line} style="stroke" strokeWidth={2} color={LINE}>
            <BlurMask blur={0.4} style="solid" />
          </Path>
          {tides.map((tide) => (
            <Circle
              key={tide.hour}
              cx={xOf(tide.hour)}
              cy={yOf(tide.height)}
              r={2.4}
              color={colors.highlight}
            />
          ))}
        </Group>
        <Group transform={dot}>
          <Circle cx={0} cy={0} r={4.5} color={colors.highlight} />
        </Group>
      </Canvas>
      <Animated.View pointerEvents="none" style={[styles.halo, halo]} />
    </>
  );
}

const HALO = 22;
const MUTED = 'hsl(212, 10%, 62%)';
const BLUE = 'hsl(210, 94%, 68%)';
const LINE = 'hsl(204, 96%, 78%)';
const DROP = 'hsla(0, 0%, 100%, 0.3)';
const WATER_TOP = 'hsla(210, 90%, 62%, 0.82)';
const WATER_LOW = 'hsla(224, 80%, 30%, 0.12)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(218, 18%, 5%)',
    padding: 16,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  arrow: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hsl(212, 86%, 42%)',
  },
  flip: { transform: [{ rotate: '180deg' }] },
  chart: { height: H },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: 'hsl(0, 0%, 100%)',
  },
  hours: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SIDE },
});
