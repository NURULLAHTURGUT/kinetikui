import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type StreakDayState = 'done' | 'today' | 'missed' | 'upcoming';

export type StreakDay = {
  /** Short day name, e.g. "Th". */
  label: string;
  state: StreakDayState;
};

export type StreakCardProps = {
  /** Days in a row. A new number pops in with a burst of confetti. */
  count: number;
  /** Line under the number. Defaults to "Back on track". */
  title?: string;
  /** The week around today, in order. The row centres on the day marked `today`. */
  days: readonly StreakDay[];
  /** Button label. Defaults to "Continue". */
  ctaLabel?: string;
  onContinue?: () => void;
  /** Colour of today's mark and a few confetti pieces. Defaults to the theme warning amber. */
  accent?: string;
  /** A success tick when the count changes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const STAGE_H = 176;
const DISC = 112;
const PILL_W = 46;
const PILL_GAP = 8;
const BURST_MS = 1300;

const STATE_WORDS: Record<StreakDayState, string> = {
  done: 'done',
  today: 'today',
  missed: 'missed',
  upcoming: 'upcoming',
};

type PieceKind = 'chip' | 'dot' | 'curl' | 'dash';
type Piece = {
  kind: PieceKind;
  angle: number;
  /** Share of the stage radius the piece flies out to. */
  reach: number;
  turn: number;
  spin: number;
  accent: boolean;
};

/** A small seeded generator, so the confetti lands the same way on every render. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const KINDS: PieceKind[] = ['chip', 'dot', 'curl', 'dash', 'chip', 'dot'];
const PIECES: Piece[] = (() => {
  const rand = seeded(7);
  return Array.from({ length: 22 }, (_, i) => ({
    kind: KINDS[i % KINDS.length]!,
    angle: (i / 22) * Math.PI * 2 + rand() * 0.4,
    reach: 0.62 + rand() * 0.38,
    turn: rand() * 360,
    spin: (rand() - 0.5) * 540,
    accent: i % 7 === 3,
  }));
})();

function shapeFor(kind: PieceKind): SkPath {
  const b = Skia.PathBuilder.Make();
  if (kind === 'chip') b.addRRect(Skia.RRectXY(Skia.XYWHRect(-4.5, -3, 9, 6), 1.5, 1.5));
  else if (kind === 'dot') b.addCircle(0, 0, 2.6);
  else if (kind === 'dash') b.moveTo(-5, 0).lineTo(5, 0);
  else
    return Skia.Path.MakeFromSVGString('M-9 3c2-7 9-7 8-1.5c-1 4-5.5 3-4.5-1c1-4.5 7.5-5 11 0.5')!;
  return b.detach();
}
const SHAPES: Record<PieceKind, SkPath> = {
  chip: shapeFor('chip'),
  dot: shapeFor('dot'),
  curl: shapeFor('curl'),
  dash: shapeFor('dash'),
};

/**
 * A streak card: the day count pops into a soft disc as confetti bursts out
 * and settles around it, and a row of day pills below ticks off the week,
 * with today's mark pulsing in the accent colour.
 */
export function StreakCard({
  count,
  title = 'Back on track',
  days,
  ctaLabel = 'Continue',
  onContinue,
  accent,
  haptics = true,
  style,
}: StreakCardProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const tone = accent ?? colors.warning;
  const [width, setWidth] = useState(0);
  const [rowWidth, setRowWidth] = useState(0);

  const burst = useSharedValue(reduced ? 1 : 0);
  const pop = useSharedValue(reduced ? 1 : 0);
  const ripple = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (!first.current) haptic('success');
    first.current = false;
    if (reduced) {
      burst.set(1);
      pop.set(1);
      return;
    }
    burst.set(0);
    burst.set(withTiming(1, { duration: BURST_MS }));
    pop.set(0);
    pop.set(withSpring(1, spring('bouncy')));
    ripple.set(0);
    ripple.set(withTiming(1, { duration: 900 }));
  }, [count, reduced, haptic, burst, pop, ripple]);

  const disc = useAnimatedStyle(() => ({ transform: [{ scale: 0.84 + pop.get() * 0.16 }] }));
  const number = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.get() * 1.6),
    transform: [{ translateY: (1 - pop.get()) * 22 }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: (1 - ripple.get()) * 0.55,
    transform: [{ scale: 1 + ripple.get() * 0.38 }],
  }));

  const today = Math.max(
    0,
    days.findIndex((d) => d.state === 'today'),
  );
  // Centre today's pill in the row.
  const offset = rowWidth / 2 - (today * (PILL_W + PILL_GAP) + PILL_W / 2);
  const fade = (deg: number) =>
    gradient(
      `linear-gradient(${deg}deg, ${colors.surfaceRaised} 0%, ${withAlpha(colors.surfaceRaised, 0)} 100%)`,
    );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          boxShadow: shadow.md,
        },
        style,
      ]}
    >
      <View style={styles.stage} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {PIECES.map((piece, i) => (
              <Confetti
                key={i}
                piece={piece}
                cx={width / 2}
                cy={STAGE_H / 2}
                spread={Math.min(width / 2 - 12, 150)}
                burst={burst}
                color={piece.accent ? tone : withAlpha(colors.textSubtle, 0.42)}
              />
            ))}
          </Canvas>
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[styles.ripple, { borderColor: withAlpha(colors.textSubtle, 0.5) }, ring]}
        />
        <Animated.View
          accessible
          accessibilityLabel={`${count} day streak`}
          style={[
            styles.halo,
            { borderColor: colors.border, backgroundColor: colors.surfaceRaised },
            disc,
          ]}
        >
          <View style={[styles.disc, { backgroundColor: colors.surfaceSunken }]}>
            <Animated.Text
              style={[
                {
                  color: colors.text,
                  fontSize: 64,
                  lineHeight: 72,
                  fontWeight: font.weight.heavy,
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -1,
                },
                number,
              ]}
            >
              {count}
            </Animated.Text>
          </View>
        </Animated.View>
      </View>

      <Text
        accessibilityRole="header"
        style={{
          color: colors.textMuted,
          fontSize: font.size.xl + 2,
          fontWeight: font.weight.semibold,
          letterSpacing: font.tracking.tight,
          textAlign: 'center',
          marginTop: space[2],
        }}
      >
        {title}
      </Text>

      <View
        accessible
        accessibilityLabel={`This week: ${days.map((d) => `${d.label} ${STATE_WORDS[d.state]}`).join(', ')}`}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        style={[styles.row, { marginTop: space[4] }]}
      >
        <View style={[styles.days, { gap: PILL_GAP, transform: [{ translateX: offset }] }]}>
          {rowWidth > 0 &&
            days.map((day, i) => (
              <DayPill
                key={`${day.label}-${i}`}
                day={day}
                order={Math.abs(i - today)}
                accent={tone}
              />
            ))}
        </View>
        <View pointerEvents="none" style={[styles.fade, styles.fadeLeft, fade(90)]} />
        <View pointerEvents="none" style={[styles.fade, styles.fadeRight, fade(270)]} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onContinue}
        style={({ pressed }) => [
          styles.cta,
          {
            marginTop: space[6],
            backgroundColor: colors.ember,
            borderRadius: radius.pill,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Text
          style={{ color: colors.onEmber, fontSize: font.size.md, fontWeight: font.weight.medium }}
        >
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/** One confetti piece flying out from the disc and settling where it lands. */
function Confetti({
  piece,
  cx,
  cy,
  spread,
  burst,
  color,
}: {
  piece: Piece;
  cx: number;
  cy: number;
  spread: number;
  burst: SharedValue<number>;
  color: string;
}) {
  const transform = useDerivedValue(() => {
    const b = burst.get();
    const e = 1 - (1 - b) ** 3;
    const reach = DISC / 2 + 6 + (spread - DISC / 2 - 6) * piece.reach;
    return [
      { translateX: cx + Math.cos(piece.angle) * reach * e },
      // A flatter oval than the stage is wide, and a little fall at the end.
      { translateY: cy + Math.sin(piece.angle) * reach * 0.56 * e + b * b * 6 },
      { rotate: ((piece.turn + piece.spin * e) * Math.PI) / 180 },
      { scale: 0.3 + 0.7 * e },
    ];
  });
  const opacity = useDerivedValue(() => Math.min(1, burst.get() * 5));
  const stroke = piece.kind === 'curl' || piece.kind === 'dash';
  return (
    <Group transform={transform} opacity={opacity}>
      <Path
        path={SHAPES[piece.kind]}
        color={color}
        style={stroke ? 'stroke' : 'fill'}
        strokeWidth={1.8}
        strokeCap="round"
      />
    </Group>
  );
}

/** A day in the week row: its mark pops in, nearest to today first. */
function DayPill({ day, order, accent }: { day: StreakDay; order: number; accent: string }) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      enter.set(1);
      return;
    }
    enter.set(withDelay(250 + order * 90, withSpring(1, spring('bouncy'))));
    if (day.state === 'today') {
      pulse.set(
        withDelay(
          700,
          withRepeat(
            withSequence(withTiming(1, timing('slow')), withTiming(0, { duration: 0 })),
            4,
          ),
        ),
      );
    }
  }, [order, reduced, day.state, enter, pulse]);

  const mark = useAnimatedStyle(() => ({ transform: [{ scale: enter.get() }] }));
  const halo = useAnimatedStyle(() => ({
    opacity: (1 - pulse.get()) * (pulse.get() > 0 ? 0.6 : 0),
    transform: [{ scale: 1 + pulse.get() * 0.7 }],
  }));

  const muted = day.state === 'upcoming' || day.state === 'missed';
  return (
    <View
      style={[styles.pill, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
    >
      <Text
        style={{
          color: muted ? colors.textSubtle : colors.textMuted,
          fontSize: font.size.sm,
          fontWeight: font.weight.medium,
        }}
      >
        {day.label}
      </Text>
      <View style={styles.markBox}>
        {day.state === 'today' ? (
          <Animated.View style={[styles.mark, styles.halo2, { backgroundColor: accent }, halo]} />
        ) : null}
        <Animated.View
          style={[
            styles.mark,
            day.state === 'done' && { backgroundColor: colors.text },
            day.state === 'today' && { backgroundColor: accent },
            muted && {
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
            },
            mark,
          ]}
        >
          {day.state === 'done' ? (
            <View style={[styles.check, { borderColor: colors.surfaceRaised }]} />
          ) : null}
          {day.state === 'today' ? (
            <View style={[styles.core, { backgroundColor: colors.highlight }]} />
          ) : null}
          {day.state === 'missed' ? (
            <View style={[styles.miss, { backgroundColor: colors.textSubtle }]} />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  stage: { height: STAGE_H, alignItems: 'center', justifyContent: 'center' },
  halo: {
    width: DISC + 18,
    height: DISC + 18,
    borderRadius: (DISC + 18) / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: DISC + 18,
    height: DISC + 18,
    borderRadius: (DISC + 18) / 2,
    borderWidth: 1.5,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { height: 76, overflow: 'hidden' },
  days: { flexDirection: 'row', position: 'absolute', left: 0, top: 0, bottom: 0 },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 44 },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
  pill: {
    width: PILL_W,
    height: 76,
    borderRadius: PILL_W / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 8,
  },
  markBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo2: { position: 'absolute' },
  check: {
    width: 12,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    marginTop: -3,
    transform: [{ rotate: '-45deg' }],
  },
  core: { width: 11, height: 11, borderRadius: 5.5 },
  miss: { width: 8, height: 2, borderRadius: 1 },
  cta: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
