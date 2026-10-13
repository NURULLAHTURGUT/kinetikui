import { Canvas, Group, Line, Path, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

/** One point of a stroke: position and ink width there. */
export type InkPoint = { x: number; y: number; w: number };
export type InkStroke = readonly InkPoint[];

export type SignaturePadProps = {
  /** Called with every stroke after each change. Empty when cleared. */
  onChange?: (strokes: readonly InkStroke[]) => void;
  /** Pad height. Defaults to 200. */
  height?: number;
  /** Widest ink, drawn when the pen moves slowly. Defaults to 4.5. */
  maxWidth?: number;
  /** Thinnest ink, drawn at speed. Defaults to 1.4. */
  minWidth?: number;
  /** Words under the line while the pad is empty. Defaults to "Sign here". */
  hint?: string;
  /** Read by screen readers. Defaults to "Signature". */
  accessibilityLabel?: string;
  /** A tick on Undo and Clear. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A filled outline around a stroke whose width varies along it: each point is
 * pushed out to both sides along the normal, the two edges are joined with
 * smoothing curves, and round ends close it.
 */
export function inkOutline(points: InkStroke): SkPath {
  'worklet';
  const b = Skia.PathBuilder.Make();
  const n = points.length;
  if (n === 0) return b.detach();
  const first = points[0]!;
  if (n === 1) return b.addCircle(first.x, first.y, first.w / 2).detach();
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  const normal: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const a = points[Math.max(0, i - 1)]!;
    const c = points[Math.min(n - 1, i + 1)]!;
    let dx = c.x - a.x;
    let dy = c.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const r = p.w / 2;
    left.push({ x: p.x - dy * r, y: p.y + dx * r });
    right.push({ x: p.x + dy * r, y: p.y - dx * r });
    normal.push(Math.atan2(dx, -dy));
  }
  const edge = (pts: { x: number; y: number }[]) => {
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      b.quadTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    const end = pts[pts.length - 1]!;
    b.lineTo(end.x, end.y);
  };
  // A round end: half a circle from one edge to the other, around the tip.
  const cap = (p: InkPoint, from: number) => {
    for (let k = 1; k < 8; k++) {
      const t = from - (k * Math.PI) / 8;
      b.lineTo(p.x + Math.cos(t) * (p.w / 2), p.y + Math.sin(t) * (p.w / 2));
    }
  };
  const last = points[n - 1]!;
  b.moveTo(left[0]!.x, left[0]!.y);
  edge(left);
  cap(last, normal[n - 1]!);
  const back = right.reverse();
  b.lineTo(back[0]!.x, back[0]!.y);
  edge(back);
  cap(first, normal[0]! + Math.PI);
  b.close();
  return b.detach();
}

/** The strokes as one SVG document, for saving or sending. */
export function signatureSvg(
  strokes: readonly InkStroke[],
  width: number,
  height: number,
  ink: string,
): string {
  const paths = strokes
    .map((s) => `<path d="${inkOutline(s).toSVGString()}" fill="${ink}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${paths}</svg>`;
}

/**
 * A pad to sign with a finger. The ink is full and round when the finger
 * moves slowly and thins as it speeds up, like a fountain pen; Undo takes the
 * last stroke back and Clear fades the whole signature away.
 */
export function SignaturePad({
  onChange,
  height = 200,
  maxWidth = 4.5,
  minWidth = 1.4,
  hint = 'Sign here',
  accessibilityLabel = 'Signature',
  haptics = true,
  testID,
  style,
}: SignaturePadProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [strokes, setStrokes] = useState<{ points: InkStroke; path: SkPath }[]>([]);
  const [width, setWidth] = useState(0);
  const live = useSharedValue<InkPoint[]>([]);
  const fade = useSharedValue(1);
  const empty = strokes.length === 0;

  const update = (next: { points: InkStroke; path: SkPath }[]) => {
    // A cleared pad starts the next signature fully opaque again.
    if (next.length === 0) fade.set(1);
    setStrokes(next);
    onChange?.(next.map((s) => s.points));
  };
  const commit = (points: InkPoint[]) => {
    if (points.length === 0) return;
    update([...strokes, { points, path: inkOutline(points) }]);
  };

  /** Adds a point; `speed` is the finger's speed in points per millisecond. */
  const add = (x: number, y: number, speed: number, first: boolean) => {
    'worklet';
    if (first) {
      live.set([{ x, y, w: (maxWidth + minWidth) / 2 }]);
      return;
    }
    const pts = live.get();
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(x - prev.x, y - prev.y) < 1.5) return;
    // Speed thins the ink; the width eases towards its target so strokes stay smooth.
    const target = Math.max(minWidth, Math.min(maxWidth, maxWidth - speed * 1.6));
    const w = prev.w * 0.65 + target * 0.35;
    live.modify((arr) => {
      'worklet';
      arr.push({ x, y, w });
      return arr;
    });
  };

  const pan = Gesture.Pan()
    .withTestId('signature-pad')
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => add(e.x, e.y, 0, true))
    .onUpdate((e) => add(e.x, e.y, Math.hypot(e.velocityX, e.velocityY) / 1000, false))
    .onFinalize(() => {
      const pts = live.get();
      scheduleOnRN(commit, pts.slice());
      live.set([]);
    });

  const current = useDerivedValue(() => inkOutline(live.get()));
  const opacity = useDerivedValue(() => fade.get());

  const undo = () => {
    if (empty) return;
    haptic('tick');
    update(strokes.slice(0, -1));
  };
  const clear = () => {
    if (empty) return;
    haptic('tick');
    if (reduced) {
      update([]);
      return;
    }
    fade.set(
      withTiming(0, { duration: durations.base, easing: easings.exit }, (done) => {
        if (done) scheduleOnRN(update, []);
      }),
    );
  };
  const hintStyle = useAnimatedStyle(() => ({
    opacity: withTiming(empty ? 1 : 0, timing('quick')),
  }));
  const base = height - 44;

  return (
    <View testID={testID} style={[{ gap: space[2] }, style]}>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${accessibilityLabel}, ${empty ? 'empty' : `${strokes.length} strokes`}`}
          accessibilityHint="Draw with one finger"
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[
            styles.pad,
            {
              height,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          {width > 0 ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <Line
                p1={vec(24, base)}
                p2={vec(width - 24, base)}
                color={colors.borderStrong}
                strokeWidth={1}
                style="stroke"
              />
              <Line
                p1={vec(26, base - 18)}
                p2={vec(36, base - 8)}
                color={colors.textSubtle}
                strokeWidth={1.5}
                style="stroke"
              />
              <Line
                p1={vec(36, base - 18)}
                p2={vec(26, base - 8)}
                color={colors.textSubtle}
                strokeWidth={1.5}
                style="stroke"
              />
              <Group opacity={opacity}>
                {strokes.map((s, i) => (
                  <Path key={i} path={s.path} color={colors.text} />
                ))}
              </Group>
              <Path path={current} color={colors.text} />
            </Canvas>
          ) : null}
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.hint,
              { top: base + 8, color: colors.textSubtle, fontSize: font.size.xs },
              hintStyle,
            ]}
          >
            {hint}
          </Animated.Text>
        </View>
      </GestureDetector>
      <View style={styles.actions}>
        <Action label="Undo" disabled={empty} onPress={undo} />
        <Action label="Clear" disabled={empty} onPress={clear} />
      </View>
    </View>
  );
}

function Action({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, font, radius, space } = useKinetikTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.action,
        {
          paddingHorizontal: space[4],
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.surfaceSunken : undefined,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { borderWidth: 1, overflow: 'hidden' },
  hint: { position: 'absolute', left: 24 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  action: { minHeight: minTouchTarget, justifyContent: 'center' },
});
