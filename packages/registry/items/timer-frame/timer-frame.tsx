import { Canvas, Circle, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type TimerFrameProps = {
  /** Full length of the timer in seconds. */
  total: number;
  /** Seconds left when it starts. Defaults to `total`. */
  start?: number;
  /** Run or hold. Defaults to true. */
  running?: boolean;
  /** Label in the pill, e.g. "BREW". Defaults to the length in minutes. */
  label?: string;
  /** Called once when the time runs out. */
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
};

const H = 104;
const RING = 8;
const CORNER = 26;
const COMET_R = 15;
const COMET_C = COMET_R + 6;
/** Degrees of tail behind the head, which sits at the top of the orbit. */
const TAIL_SWEEP = 270;
const COMET_BOX = {
  x: COMET_C - COMET_R,
  y: COMET_C - COMET_R,
  width: COMET_R * 2,
  height: COMET_R * 2,
};
const ORBIT_PATH = Skia.PathBuilder.Make().addCircle(COMET_C, COMET_C, COMET_R).detach();
const TAIL_PATH = Skia.PathBuilder.Make().addArc(COMET_BOX, 0, TAIL_SWEEP).detach();

/** Seconds as "3:37". */
export function clockLabel(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** A rounded rectangle traced clockwise from the middle of its top edge. */
export function framePath(width: number, height: number, inset: number, corner: number): string {
  const l = inset;
  const t = inset;
  const r = width - inset;
  const b = height - inset;
  const c = corner;
  return (
    `M${width / 2} ${t}H${r - c}A${c} ${c} 0 0 1 ${r} ${t + c}V${b - c}` +
    `A${c} ${c} 0 0 1 ${r - c} ${b}H${l + c}A${c} ${c} 0 0 1 ${l} ${b - c}` +
    `V${t + c}A${c} ${c} 0 0 1 ${l + c} ${t}H${width / 2}`
  );
}

/**
 * A countdown drawn around the card's edge: a thick orange frame drains clockwise
 * in one continuous UI-thread animation, and a small comet circles beside the time
 * while it runs.
 */
export function TimerFrame({
  total,
  start,
  running = true,
  label,
  onDone,
  style,
}: TimerFrameProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [left, setLeft] = useState(start ?? total);
  const active = running && left > 0;

  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setLeft((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0 && s > 0) done.current?.();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const share = total > 0 ? left / total : 0;
  const drain = useSharedValue(share);
  const spin = useSharedValue(0);

  // The frame runs off the UI thread, so a held timer stops it and a resumed one
  // sets off again from wherever the time really is.
  useEffect(() => {
    if (reduced) return;
    if (active) {
      drain.set(share);
      drain.set(withTiming(0, { duration: left * 1000, easing: easings.linear }));
    } else {
      cancelAnimation(drain);
      drain.set(share);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a run or a hold restarts it.
  }, [active, reduced, drain]);

  // Without motion the frame steps with the clock instead.
  useEffect(() => {
    if (reduced) drain.set(share);
  }, [reduced, share, drain]);

  useEffect(() => {
    if (active && !reduced) {
      spin.set(0);
      spin.set(withRepeat(withTiming(360, { duration: 2400, easing: easings.linear }), -1, false));
    } else {
      cancelAnimation(spin);
    }
  }, [active, reduced, spin]);

  const comet = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));

  const frame = useMemo(
    () =>
      width > 0 ? Skia.Path.MakeFromSVGString(framePath(width, H, RING / 2 + 1, CORNER)) : null,
    [width],
  );

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${clockLabel(left)} left${active ? '' : ', paused'}`}
      testID="timer-frame"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, style]}
    >
      {frame ? (
        <Canvas style={{ ...styles.canvas, width }} pointerEvents="none">
          <Path path={frame} style="stroke" strokeWidth={RING} color={TRACK} />
          <Path
            path={frame}
            style="stroke"
            strokeWidth={RING}
            strokeCap="round"
            color={ORANGE}
            end={drain}
          />
        </Canvas>
      ) : null}

      <Text
        style={{
          color: colors.highlight,
          fontSize: font.size.xl,
          fontWeight: font.weight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {clockLabel(left)}
      </Text>

      <Animated.View style={[styles.orbit, comet]}>
        <Canvas style={styles.orbit}>
          <Path path={ORBIT_PATH} style="stroke" strokeWidth={1} color={ORBIT_LINE} />
          <Path path={TAIL_PATH} style="stroke" strokeWidth={3} strokeCap="round">
            <SweepGradient
              c={vec(COMET_C, COMET_C)}
              colors={[TAIL_CLEAR, colors.highlight, TAIL_CLEAR]}
              positions={[0, TAIL_SWEEP / 360, 1]}
            />
          </Path>
          <Circle cx={COMET_C} cy={COMET_C - COMET_R} r={4} color={colors.highlight} />
        </Canvas>
      </Animated.View>

      <View style={[styles.pill, { borderRadius: radius.sm }]}>
        <Text style={{ color: ORANGE, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
          {label ?? `${Math.round(total / 60)} MIN`}
        </Text>
      </View>
    </View>
  );
}

const ORANGE = 'hsl(26, 96%, 54%)';
const TRACK = 'hsl(26, 30%, 14%)';
const TAIL_CLEAR = 'hsla(0, 0%, 100%, 0)';
const ORBIT_LINE = 'hsla(0, 0%, 100%, 0.1)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    height: H,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: CORNER + RING / 2 + 1,
    backgroundColor: 'hsl(0, 0%, 5%)',
  },
  canvas: { position: 'absolute', top: 0, left: 0, height: H },
  orbit: { width: COMET_C * 2, height: COMET_C * 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'hsl(26, 50%, 28%)',
  },
});
