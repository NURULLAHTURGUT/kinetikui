import {
  Canvas,
  Circle,
  Path,
  RadialGradient,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type OrbitRadarProps = {
  /** Name of what is on its way, e.g. "LUNA-2". */
  name: string;
  /** Minutes until it arrives. */
  minutes: number;
  /** How close it is, 0–1. At 1 it reaches the top of the arc. */
  progress: number;
  /** Label over the time. Defaults to "ARRIVES". */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE = 176;
const R = SIZE / 2;
const RIM = R - 5;
const VISIBLE = 96;
/** The craft travels this arc, in degrees clockwise from straight up. */
const FROM_DEG = -82;
const TO_DEG = 0;
const SWEEP_MS = 5200;
const CRAFT = 22;

/** The craft's angle for a progress of 0–1. */
export function craftAngle(progress: number): number {
  'worklet';
  const p = Math.max(0, Math.min(1, progress));
  return FROM_DEG + (TO_DEG - FROM_DEG) * p;
}

/**
 * Something on its way, shown on a radar dish rising from the bottom edge: a beam
 * sweeps round and a small craft climbs the rim, leaving a lit trail, as the
 * minutes count down.
 */
export function OrbitRadar({ name, minutes, progress, label = 'ARRIVES', style }: OrbitRadarProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const shown = Math.round(useCountUp(minutes, { instant: reduced }));
  const p = Math.max(0, Math.min(1, progress));
  const at = useSharedValue(reduced ? p : 0);
  const beam = useSharedValue(0);

  useEffect(() => {
    at.set(reduced ? p : withSpring(p, spring('smooth')));
  }, [p, reduced, at]);

  useEffect(() => {
    if (reduced) {
      beam.set(0);
      return;
    }
    beam.set(
      withRepeat(withTiming(360, { duration: SWEEP_MS, easing: easings.linear }), -1, false),
    );
  }, [reduced, beam]);

  const beamStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${beam.get()}deg` }] }));
  const craftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${craftAngle(at.get())}deg` }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={`${name}. ${label} in ${minutes} minutes`}
      style={[styles.card, style]}
    >
      <View style={styles.text}>
        <View>
          <Text style={{ color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium }}>
            {label}
          </Text>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.xl,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {shown}
            <Text style={{ fontSize: font.size.sm }}>M</Text>
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{ color: TEAL, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          {name}
        </Text>
      </View>

      <View style={styles.window} pointerEvents="none">
        <Dish at={at} />
        <Animated.View style={[styles.layer, beamStyle]}>
          <Canvas style={styles.square}>
            <Circle cx={R} cy={R} r={RIM - 2}>
              <SweepGradient
                c={vec(R, R)}
                colors={[BEAM_CLEAR, BEAM_CLEAR, BEAM, BEAM_CLEAR]}
                positions={[0, 0.6, 0.985, 1]}
              />
            </Circle>
          </Canvas>
        </Animated.View>
        <Animated.View style={[styles.layer, craftStyle]}>
          <View style={styles.craft}>
            <Svg width={CRAFT} height={CRAFT} viewBox="0 0 24 24">
              <SvgPath d="M9 12H6M15 12h3" stroke={colors.highlight} strokeWidth={1.6} />
              <SvgPath d="M1 8.5h5v7H1zM18 8.5h5v7h-5z" fill={withAlpha(colors.highlight, 0.82)} />
              <SvgPath d="M10 6.5h4l1 3v5l-1 3h-4l-1-3v-5z" fill={colors.highlight} />
            </Svg>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/** The dish: disc, rings, rim ticks and the lit trail behind the craft. */
function Dish({ at }: { at: SharedValue<number> }) {
  const { colors } = useKinetikTheme();
  const { rim, ticks, rings } = useMemo(() => {
    const box = { x: R - RIM, y: R - RIM, width: RIM * 2, height: RIM * 2 };
    const rimPath = Skia.PathBuilder.Make()
      .addArc(box, 270 + FROM_DEG, TO_DEG - FROM_DEG)
      .detach();
    const tickBuilder = Skia.PathBuilder.Make();
    for (let deg = 0; deg < 360; deg += 6) {
      const a = (deg * Math.PI) / 180;
      const inner = RIM - (deg % 30 === 0 ? 8 : 4);
      tickBuilder.moveTo(R + Math.cos(a) * inner, R + Math.sin(a) * inner);
      tickBuilder.lineTo(R + Math.cos(a) * RIM, R + Math.sin(a) * RIM);
    }
    const ringBuilder = Skia.PathBuilder.Make();
    for (const radius of [RIM * 0.34, RIM * 0.62, RIM * 0.86]) {
      ringBuilder.addCircle(R, R, radius);
    }
    return { rim: rimPath, ticks: tickBuilder.detach(), rings: ringBuilder.detach() };
  }, []);
  const trail = useDerivedValue(() => Math.max(0, Math.min(1, at.get())));

  return (
    <Canvas style={styles.full}>
      <Circle cx={R} cy={R} r={RIM}>
        <RadialGradient c={vec(R, R)} r={RIM} colors={[DISH_CORE, DISH_EDGE]} />
      </Circle>
      <Path path={rings} style="stroke" strokeWidth={1} color={RING} />
      <Path path={ticks} style="stroke" strokeWidth={1} color={TICK} />
      <Path path={rim} style="stroke" strokeWidth={2} color={TICK} />
      <Path path={rim} style="stroke" strokeWidth={7} strokeCap="round" color={GLOW} end={trail} />
      <Path
        path={rim}
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        color={colors.highlight}
        end={trail}
      />
      <Circle cx={R} cy={R} r={6} style="stroke" strokeWidth={2.5} color={colors.highlight} />
    </Canvas>
  );
}

const MUTED = 'hsl(200, 8%, 62%)';
const TEAL = 'hsl(190, 74%, 66%)';
const BEAM = 'hsla(186, 90%, 74%, 0.44)';
const GLOW = 'hsla(190, 90%, 76%, 0.22)';
const BEAM_CLEAR = 'hsla(186, 90%, 66%, 0)';
const DISH_CORE = 'hsl(192, 46%, 24%)';
const DISH_EDGE = 'hsl(200, 26%, 9%)';
const RING = 'hsla(190, 40%, 70%, 0.14)';
const TICK = 'hsla(0, 0%, 100%, 0.3)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    height: 124,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(200, 14%, 5%)',
  },
  text: { flex: 1, justifyContent: 'space-between', padding: 16 },
  window: { width: SIZE, height: 124, marginRight: -8, overflow: 'hidden' },
  full: { width: SIZE, height: SIZE, marginTop: 124 - VISIBLE - 2 },
  square: { width: SIZE, height: SIZE },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    marginTop: 124 - VISIBLE - 2,
  },
  craft: { position: 'absolute', top: R - RIM - CRAFT / 2, left: R - CRAFT / 2 },
});
