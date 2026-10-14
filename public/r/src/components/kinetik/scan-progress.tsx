import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { durations, easings, spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { glow, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type ScanProgressProps = {
  /** The image being analysed. Or pass `children` for any other media. */
  source?: ImageSourcePropType;
  children?: ReactNode;
  /** Height of the media card. Defaults to 260. */
  height?: number;
  /** 0–1. Leave out for work of unknown length: the ring creeps on and never quite closes. */
  progress?: number;
  /** Switches to the finished state: the pixels clear, the ring closes and the spinner becomes a check. */
  done?: boolean;
  /** What is happening, e.g. "Analyzing swing motion…". Changes cross-fade. */
  label: string;
  /** Shown once done. Defaults to "Analysis complete". */
  doneLabel?: string;
  /** Colour of the wash over the image, the ring and the glow. Defaults to the theme success green. */
  tint?: string;
  /** Read by screen readers for the image. */
  imageLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Pitch of the pixel grid and the size of each square, in pt. */
const PITCH = 9;
const DOT = 6;
const PILL = 60;
const RING = 2.5;

/** A repeatable 0–1 hash for a grid cell. */
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * An "analysing" state for media: a tinted wash over the image while a scan
 * band rolls down it, lighting a field of pixel squares that twinkle in its
 * wake; under it, a pill whose outline fills with progress and a dashed
 * spinner. When it is done the pixels clear, the ring closes and the spinner
 * turns into a check.
 */
export function ScanProgress({
  source,
  children,
  height = 260,
  progress,
  done = false,
  label,
  doneLabel = 'Analysis complete',
  tint,
  imageLabel,
  style,
}: ScanProgressProps) {
  const { colors, radius, space, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const color = tint ?? colors.success;
  const [media, setMedia] = useState({ width: 0, height: 0 });
  const [pill, setPill] = useState(0);

  const live = useSharedValue(done ? 0 : 1);
  useEffect(() => {
    live.set(withTiming(done ? 0 : 1, { ...timing('slow', reduced), duration: 700 }));
  }, [done, reduced, live]);

  const wash = useAnimatedStyle(() => ({ opacity: live.get() }));

  return (
    <View style={[{ gap: space[5] }, style]}>
      {/* The glow sits on its own layer behind the card, so the pixel field
          redrawing every frame never makes the blurred shadow redraw too. */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            height,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            boxShadow: glow(color),
            opacity: done ? 0 : 1,
          },
        ]}
      />
      <View
        style={[styles.card, { height, borderRadius: radius.xl, backgroundColor: colors.surface }]}
        accessible={!!imageLabel}
        accessibilityRole={imageLabel ? 'image' : undefined}
        accessibilityLabel={imageLabel}
        onLayout={(e) =>
          setMedia({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
      >
        {source ? (
          <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        {children}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, 0.3) }, wash]}
        />
        {media.width > 0 && !reduced ? (
          <Pixels width={media.width} height={media.height} running={!done} live={live} />
        ) : null}
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={done ? doneLabel : label}
        accessibilityValue={
          done
            ? { min: 0, max: 100, now: 100 }
            : progress === undefined
              ? undefined
              : { min: 0, max: 100, now: Math.round(progress * 100) }
        }
        accessibilityLiveRegion="polite"
        onLayout={(e) => setPill(e.nativeEvent.layout.width)}
        style={[styles.pill, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      >
        {pill > 0 ? <Ring width={pill} progress={progress} done={done} color={color} /> : null}
        <View
          style={[
            styles.inner,
            { backgroundColor: colors.surfaceSunken, gap: space[3], paddingHorizontal: space[5] },
          ]}
        >
          {done ? <Check color={color} /> : <Spinner />}
          <Animated.Text
            key={done ? 'done' : label}
            // Only the new label animates: an exiting copy would sit beside it in the row.
            entering={
              reduced ? undefined : FadeInDown.duration(durations.base).easing(easings.standard)
            }
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: done ? colors.text : colors.textMuted,
              fontSize: font.size.lg,
              fontWeight: font.weight.semibold,
              letterSpacing: font.tracking.tight,
            }}
          >
            {done ? doneLabel : label}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

/**
 * The pixel field. Each frame one worklet walks the grid and sorts the lit
 * squares into three brightness levels, drawn as three paths.
 */
function Pixels({
  width,
  height,
  running,
  live,
}: {
  width: number;
  height: number;
  running: boolean;
  live: SharedValue<number>;
}) {
  const { colors } = useKinetikTheme();
  const time = useShaderClock({ running, frameRate: 30 });

  // Per-cell randomness, worked out once per size.
  const grid = useMemo(() => {
    const cols = Math.floor(width / PITCH);
    const rows = Math.floor(height / PITCH);
    const left = (width - cols * PITCH) / 2;
    const top = (height - rows * PITCH) / 2;
    const seed: number[] = [];
    const rate: number[] = [];
    // Smooth value noise over blocks of four cells, so lit squares gather in
    // clusters the way detected features would, rather than as even static.
    const region: number[] = [];
    const block = 4;
    const smooth = (f: number) => f * f * (3 - 2 * f);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const bx = Math.floor(i / block);
        const by = Math.floor(j / block);
        const fx = smooth((i % block) / block);
        const fy = smooth((j % block) / block);
        const top0 = hash(bx, by) + (hash(bx + 1, by) - hash(bx, by)) * fx;
        const bottom0 = hash(bx, by + 1) + (hash(bx + 1, by + 1) - hash(bx, by + 1)) * fx;
        const n = top0 + (bottom0 - top0) * fy;
        // Push the noise towards on or off for crisper clusters.
        region.push(Math.min(1, Math.max(0, (n - 0.3) * 1.8)));
        seed.push(hash(i, j));
        rate.push(0.4 + hash(j + 17, i) * 1.4);
      }
    }
    return { cols, rows, left, top, seed, rate, region };
  }, [width, height]);

  const levels = useDerivedValue(() => {
    const t = time.get();
    const { cols, rows, left, top, seed, rate, region } = grid;
    const paths = [Skia.PathBuilder.Make(), Skia.PathBuilder.Make(), Skia.PathBuilder.Make()];
    // The band rolls top to bottom every 2.8 s, with a pause off the bottom edge.
    const sweep = ((t / 2.8) % 1) * 1.35 - 0.1;
    for (let j = 0; j < rows; j++) {
      const y = j / rows;
      const d = sweep - y;
      // Sharp leading edge, long fading trail above it, and a faint floor everywhere.
      const band = d >= 0 ? Math.exp(-d * 2.2) : Math.exp(d * 18);
      const field = 0.2 + band * 0.8;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const s = seed[k]!;
        const score = field * (0.15 + 0.85 * region[k]!);
        const blink = (s * 13 + t * rate[k]!) % 1;
        if (blink > score) continue;
        const level = score > 0.62 ? 2 : score > 0.34 ? 1 : 0;
        // Bright squares are a touch larger.
        const size = DOT + (level === 2 && s > 0.6 ? 1 : 0);
        paths[level]!.addRect(
          Skia.XYWHRect(
            left + i * PITCH + (PITCH - size) / 2,
            top + j * PITCH + (PITCH - size) / 2,
            size,
            size,
          ),
        );
      }
    }
    return paths.map((p) => p.detach());
  });

  const low = useDerivedValue<SkPath>(() => levels.get()[0]!);
  const mid = useDerivedValue<SkPath>(() => levels.get()[1]!);
  const high = useDerivedValue<SkPath>(() => levels.get()[2]!);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group opacity={live}>
        <Path path={low} color={withAlpha(colors.highlight, 0.28)} />
        <Path path={mid} color={withAlpha(colors.highlight, 0.6)} />
        <Path path={high} color={withAlpha(colors.highlight, 0.95)} />
      </Group>
    </Canvas>
  );
}

/** The outline of the pill, traced clockwise from the top centre. */
function ringPath(w: number, h: number): SkPath {
  const s = RING / 2;
  const x0 = s;
  const y0 = s;
  const x1 = w - s;
  const y1 = h - s;
  const r = (h - RING) / 2;
  const cx = w / 2;
  const d = [
    `M ${cx} ${y0}`,
    `H ${x1 - r}`,
    `A ${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
    `A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
    `H ${x0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0} ${y0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
    `H ${cx}`,
  ].join(' ');
  return Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();
}

function Ring({
  width,
  progress,
  done,
  color,
}: {
  width: number;
  progress?: number;
  done: boolean;
  color: string;
}) {
  const reduced = useReduceMotion();
  const path = useMemo(() => ringPath(width, PILL), [width]);
  const end = useSharedValue(0);
  // Without a known progress, creep towards 90% and slow down, the way waits feel.
  const creep = useSharedValue(0);
  const known = progress !== undefined;

  useEffect(() => {
    if (known || done) return;
    creep.set(
      reduced ? 0.6 : withTiming(0.9, { duration: 14000, easing: Easing.out(Easing.cubic) }),
    );
  }, [known, done, reduced, creep]);

  useEffect(() => {
    if (done) {
      end.set(withTiming(1, { ...timing('slow', reduced), duration: 600 }));
    } else if (known) {
      end.set(withSpring(Math.max(0, Math.min(1, progress)), spring('smooth', reduced)));
    }
  }, [done, known, progress, reduced, end]);

  const trace = useDerivedValue(() => (known || done ? end.get() : creep.get()));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        path={path}
        style="stroke"
        strokeWidth={RING}
        strokeCap="round"
        color={color}
        start={0}
        end={trace}
      />
    </Canvas>
  );
}

/** Eight dashes in a circle, turning. */
function Spinner() {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(
      reduced ? 0 : withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1),
    );
  }, [reduced, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  return (
    <Animated.View aria-hidden style={[styles.spinner, spin]}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={[styles.dashSlot, { transform: [{ rotate: `${i * 45}deg` }] }]}>
          <View style={[styles.dash, { backgroundColor: colors.textSubtle }]} />
        </View>
      ))}
    </Animated.View>
  );
}

/** A filled circle that pops in, then a tick that draws itself. */
function Check({ color }: { color: string }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const tick = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    pop.set(withSpring(1, spring('bouncy')));
    tick.set(withDelay(140, withTiming(1, timing('base'))));
  }, [reduced, pop, tick]);
  const circle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const mark = useAnimatedStyle(() => ({
    opacity: tick.get(),
    transform: [{ rotate: '-45deg' }, { scale: 0.5 + tick.get() * 0.5 }],
  }));
  return (
    <Animated.View aria-hidden style={[styles.check, { backgroundColor: color }, circle]}>
      <Animated.View style={[styles.tick, { borderColor: colors.background }, mark]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: { overflow: 'hidden' },
  pill: {
    height: PILL,
    borderRadius: PILL / 2,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
  },
  inner: {
    flex: 1,
    borderRadius: PILL / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: { width: 22, height: 22 },
  dashSlot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 22,
    height: 22,
    alignItems: 'center',
  },
  dash: { width: 2, height: 5, borderRadius: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { width: 11, height: 6, marginTop: -3, borderLeftWidth: 2, borderBottomWidth: 2 },
});
