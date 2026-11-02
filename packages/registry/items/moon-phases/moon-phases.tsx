import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type MoonPhasesProps = {
  /** Position in the lunar cycle, 0–1: 0 is new moon, 0.5 is full moon. */
  phase: number;
  /** Heading. Defaults to the phase's name, e.g. "Waning Gibbous". */
  title?: string;
  /** Line under the moons. Defaults to the days until the next full moon. */
  caption?: string;
  style?: StyleProp<ViewStyle>;
};

const LUNAR_DAYS = 29.53;
const COUNT = 7;
const STEP = 1 / 8;
const ROW_H = 64;
const SIDE_R = 11;
const CENTER_R = 18;
/** Dark seas on the moon's face, as [x, y, radius] in disc radii. */
const SEAS = [
  [-0.32, -0.38, 0.26],
  [0.08, -0.5, 0.2],
  [0.3, -0.08, 0.3],
  [-0.2, 0.22, 0.22],
  [0.22, 0.52, 0.16],
] as const;

const NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];

/** The phase wrapped into 0–1. */
function wrap(phase: number) {
  return ((phase % 1) + 1) % 1;
}

export function phaseName(phase: number): string {
  return NAMES[Math.round(wrap(phase) * 8) % 8]!;
}

/** How much of the disc is lit, 0–1. */
export function illumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * wrap(phase))) / 2;
}

/** Whole days until the next full moon. */
export function daysToFull(phase: number): number {
  return Math.round(wrap(0.5 - phase) * LUNAR_DAYS);
}

/**
 * SVG path of the lit part of a moon of radius `r` centred on the origin: one
 * half of the disc closed by the terminator, an ellipse that narrows towards the
 * quarters. Waxing moons are lit on the right, waning moons on the left.
 */
export function moonPath(r: number, phase: number): string {
  const p = wrap(phase);
  const rx = (r * Math.abs(Math.cos(2 * Math.PI * p))).toFixed(3);
  const waxing = p < 0.5;
  const gibbous = p > 0.25 && p < 0.75;
  const edge = waxing ? 1 : 0;
  const terminator = waxing === gibbous ? 1 : 0;
  return `M0 ${-r}A${r} ${r} 0 0 ${edge} 0 ${r}A${rx} ${r} 0 0 ${terminator} 0 ${-r}Z`;
}

/**
 * The moon this week: a row of discs around tonight's, which swells in the middle
 * with a soft halo. The discs pop in from the centre outwards, and stepping to a
 * new night makes tonight's moon bounce.
 */
export function MoonPhases({ phase, title, caption, style }: MoonPhasesProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const lit = Math.round(illumination(phase) * 100);
  const shown = Math.round(useCountUp(lit, { instant: reduced }));
  const heading = title ?? phaseName(phase);
  const days = daysToFull(phase);

  return (
    <View
      accessible
      accessibilityLabel={`${heading}, ${lit}% lit. ${caption ?? `Next full moon in ${days} days`}`}
      style={[styles.card, style]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, gradient(GLOW)]} />
      <View style={styles.head}>
        <Text
          numberOfLines={1}
          style={[
            styles.grow,
            { color: TITLE, fontSize: font.size.sm + 1, fontWeight: font.weight.semibold },
          ]}
        >
          {heading}
        </Text>
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {shown}
          <Text style={{ fontSize: font.size.xs }}>%</Text>
        </Text>
      </View>

      <View
        testID="moon-phases-row"
        style={styles.row}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? <Row width={width} phase={phase} /> : null}
      </View>

      <Text style={{ color: MUTED, fontSize: font.size.xs + 1 }}>
        {caption ?? (
          <>
            Next full moon in{' '}
            <Text style={{ color: colors.highlight, fontWeight: font.weight.semibold }}>
              {days} days
            </Text>
          </>
        )}
      </Text>
    </View>
  );
}

function Row({ width, phase }: { width: number; phase: number }) {
  const reduced = useReduceMotion();
  const reveal = useSharedValue(reduced ? 1 : 0);
  const bounce = useSharedValue(1);

  useEffect(() => {
    if (!reduced) reveal.set(withSpring(1, spring('smooth')));
  }, [reduced, reveal]);

  useEffect(() => {
    if (reduced) return;
    bounce.set(withSequence(withSpring(1.14, spring('snappy')), withSpring(1, spring('bouncy'))));
  }, [phase, reduced, bounce]);

  const mid = (COUNT - 1) / 2;
  return (
    <Canvas style={{ width, height: ROW_H }}>
      {Array.from({ length: COUNT }, (_, i) => (
        <Disc
          key={i}
          x={SIDE_R + (i * (width - SIDE_R * 2)) / (COUNT - 1)}
          distance={Math.abs(i - mid)}
          radius={i === mid ? CENTER_R : SIDE_R}
          phase={phase + (i - mid) * STEP}
          reveal={reveal}
          bounce={i === mid ? bounce : null}
        />
      ))}
    </Canvas>
  );
}

function Disc({
  x,
  distance,
  radius,
  phase,
  reveal,
  bounce,
}: {
  x: number;
  distance: number;
  radius: number;
  phase: number;
  reveal: SharedValue<number>;
  bounce: SharedValue<number> | null;
}) {
  const lit = useMemo(() => Skia.Path.MakeFromSVGString(moonPath(radius, phase))!, [radius, phase]);
  const disc = useMemo(() => Skia.PathBuilder.Make().addCircle(0, 0, radius).detach(), [radius]);
  const place = useDerivedValue(() => {
    // The middle disc arrives first and the rest follow it outwards.
    const start = distance * 0.14;
    const t = Math.max(0, Math.min(1, (reveal.get() - start) / (1 - start)));
    return [
      { translateX: x },
      { translateY: ROW_H / 2 },
      { scale: t * (bounce ? bounce.get() : 1) },
    ];
  });
  return (
    <Group transform={place}>
      {bounce ? (
        <Circle cx={0} cy={0} r={radius + 2} color={HALO}>
          <BlurMask blur={7} style="normal" />
        </Circle>
      ) : null}
      <Group clip={disc}>
        <Circle cx={0} cy={0} r={radius}>
          <RadialGradient c={vec(0, 0)} r={radius} colors={[NIGHT_CORE, NIGHT_EDGE]} />
        </Circle>
        {/* A blurred edge makes the shadow fall off round the sphere rather than cut it. */}
        <Group opacity={distance === 0 ? 1 : 0.78}>
          <Path path={lit}>
            <RadialGradient
              c={vec(0, 0)}
              r={radius * 1.04}
              colors={[LIGHT_CORE, LIGHT_MID, LIGHT_LIMB]}
              positions={[0, 0.72, 1]}
            />
            <BlurMask blur={radius * 0.1} style="normal" />
          </Path>
          <Group clip={lit}>
            {SEAS.map(([sx, sy, sr], i) => (
              <Circle key={i} cx={sx * radius} cy={sy * radius} r={sr * radius} color={SEA}>
                <BlurMask blur={radius * 0.07} style="normal" />
              </Circle>
            ))}
          </Group>
        </Group>
      </Group>
    </Group>
  );
}

const MUTED = 'hsl(240, 8%, 66%)';
const TITLE = 'hsl(248, 90%, 80%)';
const HALO = 'hsla(46, 60%, 82%, 0.42)';
const NIGHT_CORE = 'hsl(240, 12%, 15%)';
const NIGHT_EDGE = 'hsl(240, 14%, 9%)';
const LIGHT_CORE = 'hsl(46, 30%, 94%)';
const LIGHT_MID = 'hsl(44, 18%, 82%)';
const LIGHT_LIMB = 'hsl(232, 8%, 56%)';
const SEA = 'hsla(226, 10%, 46%, 0.2)';
const GLOW =
  'linear-gradient(115deg, hsl(258, 70%, 34%) 0%, transparent 44%, transparent 60%, hsl(238, 60%, 30%) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(240, 12%, 5%)',
    padding: 16,
    gap: 2,
  },
  glow: { opacity: 0.32 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  row: { height: ROW_H },
});
