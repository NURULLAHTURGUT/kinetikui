import { Canvas, Circle, Group, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type GaugeMeterProps = {
  value: number;
  /** Defaults to 0. */
  min?: number;
  /** Defaults to 100. */
  max?: number;
  /** Under the figure, e.g. "Download speed". */
  label?: string;
  /** Formats the figure as it counts, and the two ends. Defaults to whole numbers. */
  formatValue?: (value: number) => string;
  /** Unit after the figure, e.g. "Mbps". */
  unit?: string;
  /** Width of the gauge. Defaults to 240. */
  size?: number;
  /** Width of the arc. Defaults to 14. */
  thickness?: number;
  /** Degrees of the arc, 180–300. Defaults to 240. */
  sweep?: number;
  /** Ticks around the outside. Defaults to true. */
  ticks?: boolean;
  /** Arc colours from the start to the tip. Defaults to sky into azure. */
  colors?: readonly [string, string];
  /** What the gauge measures, read before the value, e.g. "Download speed". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Tick marks around the arc: every 5%, longer every 25%. */
const TICKS = 21;
/** Width of the labels under the arc's ends. */
const END_W = 64;

/**
 * A dial that swings to its value on a spring while the figure counts up
 * beneath it. The arc brightens from one end to the other, and a knob rides
 * its tip.
 */
export function GaugeMeter({
  value,
  min = 0,
  max = 100,
  label,
  formatValue = (v) => String(Math.round(v)),
  unit,
  size = 240,
  thickness = 14,
  sweep = 240,
  ticks = true,
  colors: ramp,
  accessibilityLabel,
  style,
}: GaugeMeterProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();

  const arc = Math.max(180, Math.min(300, sweep));
  const share = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const [from, to] = ramp ?? [colors.sky, colors.azure];

  const c = size / 2;
  const r = c - thickness / 2 - (ticks ? 14 : 2);
  // The arc is open at the bottom. Its ends sit `lift` degrees below the horizontal.
  const start = 90 + (360 - arc) / 2;
  const lift = ((arc - 180) / 2) * (Math.PI / 180);
  const endX = r * Math.cos(lift);
  const endY = c + r * Math.sin(lift);
  const labelTop = endY + thickness / 2 + 6;
  const height = Math.ceil(labelTop + 18);

  const { track, tickPath, majorPath } = useMemo(() => {
    const oval = { x: c - r, y: c - r, width: r * 2, height: r * 2 };
    const t = Skia.PathBuilder.Make().addArc(oval, 0, arc).detach();
    const minor = Skia.PathBuilder.Make();
    const major = Skia.PathBuilder.Make();
    for (let i = 0; i < TICKS; i++) {
      const a = ((arc * i) / (TICKS - 1)) * (Math.PI / 180);
      const big = i % 5 === 0;
      const inner = r + thickness / 2 + 5;
      const outer = inner + (big ? 8 : 4);
      const b = big ? major : minor;
      b.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
      b.lineTo(c + Math.cos(a) * outer, c + Math.sin(a) * outer);
    }
    return { track: t, tickPath: minor.detach(), majorPath: major.detach() };
  }, [c, r, arc, thickness]);

  const progress = useSharedValue(reduced ? share : 0);
  useEffect(() => {
    progress.set(withSpring(share, spring('smooth', reduced)));
  }, [share, reduced, progress]);

  const end = useDerivedValue(() => Math.max(0.0001, Math.min(1, progress.get())));
  const knob = useDerivedValue(() => {
    const a = arc * Math.max(0, Math.min(1, progress.get())) * (Math.PI / 180);
    return vec(c + Math.cos(a) * r, c + Math.sin(a) * r);
  });

  const shown = useCountUp(value, { instant: reduced, duration: 1100, from: min });
  const text = formatValue(shown);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min,
        max,
        now: value,
        text: `${formatValue(value)}${unit ? ` ${unit}` : ''}`,
      }}
      style={[{ width: size, height }, style]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Drawn from 0°, then turned so the arc opens at the bottom. */}
          <Group origin={vec(c, c)} transform={[{ rotate: (start * Math.PI) / 180 }]}>
            {ticks ? (
              <>
                <Path
                  path={tickPath}
                  style="stroke"
                  strokeWidth={1.25}
                  strokeCap="round"
                  color={colors.borderStrong}
                />
                <Path
                  path={majorPath}
                  style="stroke"
                  strokeWidth={1.75}
                  strokeCap="round"
                  color={colors.textSubtle}
                />
              </>
            ) : null}
            <Path
              path={track}
              style="stroke"
              strokeWidth={thickness}
              strokeCap="round"
              color={colors.track}
            />
            <Path path={track} style="stroke" strokeWidth={thickness} strokeCap="round" end={end}>
              {/* The start colour also fills the open gap, so the round cap at 0° is not tinted by the tip. */}
              <SweepGradient
                c={vec(c, c)}
                colors={[from, to, to, from]}
                positions={[0, arc / 360, (arc + (360 - arc) / 2) / 360, 1]}
              />
            </Path>
            <Circle c={knob} r={thickness * 0.9} color={withAlpha(to, 0.25)} />
            <Circle c={knob} r={thickness * 0.62} color={colors.surfaceRaised} />
            <Circle c={knob} r={thickness * 0.3} color={to} />
          </Group>
        </Canvas>
      </View>

      <View pointerEvents="none" style={[styles.readout, { top: c - 34 }]}>
        <View style={styles.figure}>
          <Text
            style={{
              color: colors.text,
              fontSize: Math.round(size * 0.18),
              fontWeight: font.weight.bold,
              letterSpacing: -1.2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {text}
          </Text>
          {unit ? (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
                marginLeft: 4,
              }}
            >
              {unit}
            </Text>
          ) : null}
        </View>
        {label ? (
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 }}>
            {label}
          </Text>
        ) : null}
      </View>

      {[min, max].map((v, i) => (
        <Text
          key={i}
          style={[
            styles.end,
            {
              top: labelTop,
              left: c + (i === 0 ? -endX : endX) - END_W / 2,
              color: colors.textSubtle,
              fontSize: font.size.xs,
            },
          ]}
        >
          {formatValue(v)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  figure: { flexDirection: 'row', alignItems: 'baseline' },
  end: { position: 'absolute', width: END_W, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
