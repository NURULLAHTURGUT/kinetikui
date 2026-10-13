import { Canvas, Circle, Line, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type SlopeSeries = {
  label: string;
  /** Value on the left, e.g. last year. */
  from: number;
  /** Value on the right, e.g. this year. */
  to: number;
};

export type SlopeChartProps = {
  series: readonly SlopeSeries[];
  /** Heading over the left column. Defaults to 'Before'. */
  fromLabel?: string;
  /** Heading over the right column. Defaults to 'After'. */
  toLabel?: string;
  /** Formats values beside the dots. Defaults to whole numbers. */
  formatValue?: (value: number) => string;
  /** Plot height, without the headings. Defaults to 240. */
  height?: number;
  /** What the chart shows, read first, e.g. "Share of trips by city". */
  accessibilityLabel: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const LABEL_W = 92;
const ROW_H = 18;
const DOT = 4;

/** Spreads label positions apart so none overlap, keeping each as close to its dot as it can. */
function spread(ys: number[], min: number, max: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = order.map((o) => o.y);
  for (let k = 1; k < out.length; k++) out[k] = Math.max(out[k]!, out[k - 1]! + ROW_H);
  // Pushed past the bottom: walk back up.
  const overflow = out.length ? out[out.length - 1]! - max : 0;
  if (overflow > 0) for (let k = 0; k < out.length; k++) out[k] = out[k]! - overflow;
  for (let k = out.length - 2; k >= 0; k--) out[k] = Math.min(out[k]!, out[k + 1]! - ROW_H);
  for (let k = 0; k < out.length; k++) out[k] = Math.max(min, out[k]!);
  const result = new Array<number>(ys.length);
  order.forEach((o, k) => (result[o.i] = out[k]!));
  return result;
}

/**
 * Before and after on two axes. Each line draws itself from left to right,
 * rising lines in blue and falling ones in grey, and new data slides every
 * end to its new place. Tap a label to bring one line forward.
 */
export function SlopeChart({
  series,
  fromLabel = 'Before',
  toLabel = 'After',
  formatValue = (v) => String(Math.round(v)),
  height = 240,
  accessibilityLabel,
  testID,
  style,
}: SlopeChartProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);

  const pad = ROW_H / 2 + 2;
  const { yFrom, yTo, labelsFrom, labelsTo } = useMemo(() => {
    const values = series.flatMap((s) => [s.from, s.to]);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
    const a = series.map((s) => y(s.from));
    const b = series.map((s) => y(s.to));
    return {
      yFrom: a,
      yTo: b,
      labelsFrom: spread(a, ROW_H / 2, height - ROW_H / 2),
      labelsTo: spread(b, ROW_H / 2, height - ROW_H / 2),
    };
  }, [series, height, pad]);

  const xL = LABEL_W;
  const xR = Math.max(xL + 1, width - LABEL_W);
  const summary = series
    .map((s) => `${s.label}: ${formatValue(s.from)} to ${formatValue(s.to)}`)
    .join('; ');

  return (
    <View testID={testID} style={style}>
      <View style={styles.heads}>
        {[fromLabel, toLabel].map((h, i) => (
          <Text
            key={h + i}
            style={[
              styles.head,
              {
                color: colors.textSubtle,
                fontSize: font.size.xs,
                fontWeight: font.weight.semibold,
              },
              i === 1 && styles.right,
            ]}
          >
            {h}
          </Text>
        ))}
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}. ${fromLabel} to ${toLabel}. ${summary}`}
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Canvas style={{ width, height }}>
            <Line
              style="stroke"
              p1={vec(xL, 0)}
              p2={vec(xL, height)}
              color={colors.border}
              strokeWidth={1}
            />
            <Line
              style="stroke"
              p1={vec(xR, 0)}
              p2={vec(xR, height)}
              color={colors.border}
              strokeWidth={1}
            />
            {series.map((s, i) => (
              <SlopeLine
                key={s.label}
                index={i}
                xL={xL}
                xR={xR}
                yL={yFrom[i]!}
                yR={yTo[i]!}
                color={s.to >= s.from ? colors.azure : colors.textSubtle}
                dimmed={focus !== null && focus !== i}
                strong={focus === i}
                reduced={reduced}
              />
            ))}
          </Canvas>
        ) : null}
        {width > 0
          ? series.map((s, i) => {
              const rising = s.to >= s.from;
              const dimmed = focus !== null && focus !== i;
              const change = s.to - s.from;
              return [
                <Label
                  key={`${s.label}-l`}
                  y={labelsFrom[i]!}
                  side="left"
                  reduced={reduced}
                  dimmed={dimmed}
                  onPress={() => setFocus((f) => (f === i ? null : i))}
                  text={`${s.label}  ${formatValue(s.from)}`}
                  color={colors.textMuted}
                  strong={focus === i}
                />,
                <Label
                  key={`${s.label}-r`}
                  y={labelsTo[i]!}
                  side="right"
                  reduced={reduced}
                  dimmed={dimmed}
                  onPress={() => setFocus((f) => (f === i ? null : i))}
                  text={`${formatValue(s.to)}  ${change >= 0 ? '+' : '−'}${formatValue(Math.abs(change))}`}
                  color={rising ? colors.azure : colors.textMuted}
                  strong={focus === i}
                />,
              ];
            })
          : null}
      </View>
    </View>
  );
}

type SlopeLineProps = {
  index: number;
  xL: number;
  xR: number;
  yL: number;
  yR: number;
  color: string;
  dimmed: boolean;
  strong: boolean;
  reduced: boolean;
};

function SlopeLine({ index, xL, xR, yL, yR, color, dimmed, strong, reduced }: SlopeLineProps) {
  const a = useSharedValue(yL);
  const b = useSharedValue(yR);
  const draw = useSharedValue(reduced ? 1 : 0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      draw.set(1);
      return;
    }
    // Lines draw in one after another the first time.
    draw.set(
      withDelay(
        index * 90,
        withTiming(1, { duration: durations.slow * 1.4, easing: easings.standard }),
      ),
    );
  }, [index, reduced, draw]);
  useEffect(() => {
    a.set(withSpring(yL, spring('smooth', reduced)));
    b.set(withSpring(yR, spring('smooth', reduced)));
  }, [yL, yR, reduced, a, b]);
  useEffect(() => {
    fade.set(withTiming(dimmed ? 0.18 : 1, { duration: reduced ? 0 : durations.base }));
  }, [dimmed, reduced, fade]);

  const p1 = useDerivedValue(() => vec(xL, a.get()));
  const p2 = useDerivedValue(() => {
    const d = draw.get();
    return vec(xL + (xR - xL) * d, a.get() + (b.get() - a.get()) * d);
  });
  const endR = useDerivedValue(() => DOT * Math.max(0, Math.min(1, (draw.get() - 0.85) / 0.15)));

  return (
    <>
      <Line
        style="stroke"
        p1={p1}
        p2={p2}
        color={color}
        strokeWidth={strong ? 3 : 2}
        strokeCap="round"
        opacity={fade}
      />
      <Circle c={p1} r={DOT} color={color} opacity={fade} />
      <Circle c={p2} r={endR} color={color} opacity={fade} />
    </>
  );
}

type LabelProps = {
  y: number;
  side: 'left' | 'right';
  text: string;
  color: string;
  strong: boolean;
  dimmed: boolean;
  reduced: boolean;
  onPress: () => void;
};

function Label({ y, side, text, color, strong, dimmed, reduced, onPress }: LabelProps) {
  const { font } = useKinetikTheme();
  const top = useSharedValue(y);
  useEffect(() => {
    top.set(withSpring(y, spring('smooth', reduced)));
  }, [y, reduced, top]);
  const style = useAnimatedStyle(() => ({ top: top.get() - ROW_H / 2 }));

  return (
    <Animated.View
      style={[styles.label, side === 'left' ? styles.labelLeft : styles.labelRight, style]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Pressable onPress={onPress} hitSlop={{ top: 13, bottom: 13 }}>
        <Text
          numberOfLines={1}
          style={{
            color,
            opacity: dimmed ? 0.35 : 1,
            fontSize: font.size.xs,
            fontWeight: strong ? font.weight.bold : font.weight.medium,
            textAlign: side === 'left' ? 'right' : 'left',
            fontVariant: ['tabular-nums'],
          }}
        >
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heads: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  // Each heading sits against its axis, like the labels under it.
  head: { width: LABEL_W - 8, textAlign: 'right' },
  right: { textAlign: 'left', width: LABEL_W - 8 },
  label: { position: 'absolute', height: ROW_H, width: LABEL_W - 10, justifyContent: 'center' },
  labelLeft: { left: 0 },
  labelRight: { right: 0 },
});
