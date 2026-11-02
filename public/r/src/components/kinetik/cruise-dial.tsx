import { Canvas, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type CruiseDialProps = {
  /** The speed the dial and the display settle on. */
  speed: number;
  /** Unit beside the display, e.g. "/KMH". */
  unit?: string;
  /** Numbered marks on the dial are this far apart. Defaults to 100. */
  step?: number;
  /** Chip in the corner, e.g. the flight number. */
  tag?: string;
  /** Label over the reading, e.g. "CEILING:". */
  label?: string;
  /** Figure in the corner, e.g. "11,234 M". */
  reading?: string;
  style?: StyleProp<ViewStyle>;
};

/** Degrees between numbered marks. The last mark stays out of sight of the first. */
const STEP_DEG = 28;
const MARKS = 10;
const MINOR = 5;
const DIGITS = 4;

/** Which of the seven segments each digit lights: top, top right, bottom right, bottom, bottom left, top left, middle. */
const SEGMENTS: Record<string, string> = {
  '0': '1111110',
  '1': '0110000',
  '2': '1101101',
  '3': '1111001',
  '4': '0110011',
  '5': '1011011',
  '6': '1011111',
  '7': '1110000',
  '8': '1111111',
  '9': '1111011',
};

/** SVG path of the lit segments of `digits`, each in a 10 by 18 cell, 3 apart. */
export function segmentPath(digits: string) {
  const bars = [
    'M1.5 0H8.5L7 2H3Z',
    'M10 1.5V8L8 7V3Z',
    'M10 10V16.5L8 15V11Z',
    'M1.5 18H8.5L7 16H3Z',
    'M0 10V16.5L2 15V11Z',
    'M0 1.5V8L2 7V3Z',
    'M1.5 9L3 8H7L8.5 9L7 10H3Z',
  ];
  return [...digits]
    .map((digit, i) =>
      bars
        .filter((_, s) => SEGMENTS[digit]?.[s] === '1')
        .map((bar) => shift(bar, i * 13))
        .join(''),
    )
    .join('');
}

/** Moves an absolute path made of M, H, V, L and Z along x. */
function shift(d: string, dx: number) {
  return d.replace(/([MLHV])([\d.]+)(?: ([\d.]+))?/g, (_, op: string, a: string, b?: string) => {
    if (op === 'V') return `${op}${a}`;
    return `${op}${Number(a) + dx}${b === undefined ? '' : ` ${b}`}`;
  });
}

/**
 * A cockpit-style speed readout: a big numbered dial turns under a fixed needle
 * and settles on the speed, while a small LCD counts to the same number. The
 * dial's lit arc warms towards the needle from the left.
 */
export function CruiseDial({
  speed,
  unit = '/KMH',
  step = 100,
  tag,
  label,
  reading,
  style,
}: CruiseDialProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const max = step * (MARKS - 1);
  const v = Math.max(0, Math.min(max, speed));
  const shown = Math.round(useCountUp(v, { instant: reduced, from: Math.max(0, v - step) }));

  const turn = useSharedValue(reduced ? v : Math.max(0, v - step));
  useEffect(() => {
    turn.set(reduced ? v : withSpring(v, spring('smooth')));
  }, [v, reduced, turn]);
  const dial = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(-turn.get() / step) * STEP_DEG}deg` }],
  }));

  const r = width * 0.54;
  const top = width * 0.44;

  return (
    <View
      accessible
      accessibilityLabel={[tag, label && reading ? `${label} ${reading}` : reading, `${v} ${unit}`]
        .filter(Boolean)
        .join('. ')}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, gradient(BACKDROP), { padding: space[4] }, style]}
    >
      {width > 0 ? (
        <>
          <Grid width={width} />
          <Animated.View
            pointerEvents="none"
            testID="cruise-dial-scale"
            style={[styles.scale, { width: r * 2, height: r * 2, left: width / 2 - r, top }, dial]}
          >
            <Ticks r={r} />
            {Array.from({ length: MARKS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.mark,
                  {
                    left: r - 24,
                    top: r - 8,
                    transform: [{ rotate: `${i * STEP_DEG}deg` }, { translateY: -(r - 28) }],
                  },
                ]}
              >
                <Text style={{ color: withAlpha(colors.highlight, 0.72), fontSize: font.size.xs }}>
                  {i * step}
                </Text>
              </View>
            ))}
          </Animated.View>
          <Rim width={width} r={r} top={top} />
          <View
            style={[styles.needle, { left: width / 2 - 1.5, top: top - 7, height: width * 0.3 }]}
          >
            <View style={styles.needleTip} />
          </View>
        </>
      ) : null}

      <View style={styles.top}>
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
        <View style={styles.end}>
          {label ? (
            <Text
              numberOfLines={1}
              style={{ color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium }}
            >
              {label}
            </Text>
          ) : null}
          {reading ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.highlight,
                fontSize: font.size.sm + 1,
                fontWeight: font.weight.semibold,
              }}
            >
              {reading}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.lcdWrap}>
        <Lcd value={shown} unit={unit} />
      </View>
    </View>
  );
}

/** The faint grid behind the dial. */
function Grid({ width }: { width: number }) {
  const { colors } = useKinetikTheme();
  const lines = useMemo(() => {
    const gap = width / 8;
    let d = '';
    for (let i = 1; i < 8; i++) d += `M${i * gap} 0V${width}M0 ${i * gap}H${width}`;
    return Skia.Path.MakeFromSVGString(d);
  }, [width]);
  if (!lines) return null;
  return (
    <Canvas style={{ ...styles.fill, width, height: width }} pointerEvents="none">
      <Path
        path={lines}
        color={withAlpha(colors.highlight, 0.035)}
        style="stroke"
        strokeWidth={1}
      />
    </Canvas>
  );
}

/** Tick marks around the dial. They turn with it as one still canvas. */
function Ticks({ r }: { r: number }) {
  const { colors } = useKinetikTheme();
  const [major, minor] = useMemo(() => {
    const ticks = (from: number, to: number, keep: (i: number) => boolean) => {
      let d = '';
      for (let i = 0; i < (MARKS - 1) * MINOR + 1; i++) {
        if (!keep(i)) continue;
        const a = ((i * STEP_DEG) / MINOR - 90) * (Math.PI / 180);
        d +=
          `M${(r + Math.cos(a) * from).toFixed(2)} ${(r + Math.sin(a) * from).toFixed(2)}` +
          `L${(r + Math.cos(a) * to).toFixed(2)} ${(r + Math.sin(a) * to).toFixed(2)}`;
      }
      return Skia.Path.MakeFromSVGString(d);
    };
    return [
      ticks(r - 14, r - 2, (i) => i % MINOR === 0),
      ticks(r - 8, r - 2, (i) => i % MINOR !== 0),
    ];
  }, [r]);
  return (
    <Canvas style={{ width: r * 2, height: r * 2 }}>
      {major ? (
        <Path
          path={major}
          color={withAlpha(colors.highlight, 0.8)}
          style="stroke"
          strokeWidth={1.5}
        />
      ) : null}
      {minor ? (
        <Path
          path={minor}
          color={withAlpha(colors.highlight, 0.34)}
          style="stroke"
          strokeWidth={1}
        />
      ) : null}
    </Canvas>
  );
}

/** The fixed rim: warm on the left, up to the needle, and grey on the right. */
function Rim({ width, r, top }: { width: number; r: number; top: number }) {
  const [warm, cool] = useMemo(() => {
    const oval = { x: width / 2 - r, y: top, width: r * 2, height: r * 2 };
    const arc = (start: number, sweep: number) =>
      Skia.PathBuilder.Make().addArc(oval, start, sweep).detach();
    return [arc(216, 54), arc(270, 54)];
  }, [width, r, top]);
  return (
    <Canvas style={{ ...styles.fill, width, height: width }} pointerEvents="none">
      <Group>
        <Path path={warm} style="stroke" strokeWidth={4} strokeCap="round">
          <LinearGradient
            start={vec(width * 0.05, 0)}
            end={vec(width / 2, 0)}
            colors={[RIM_FADE, RIM_RED]}
          />
        </Path>
        <Path path={cool} style="stroke" strokeWidth={4} strokeCap="round">
          <LinearGradient
            start={vec(width / 2, 0)}
            end={vec(width * 0.95, 0)}
            colors={[RIM_GREY, RIM_FADE]}
          />
        </Path>
      </Group>
    </Canvas>
  );
}

/** A small LCD: dark segments on green, unlit eights faintly behind. */
function Lcd({ value, unit }: { value: number; unit: string }) {
  const { font, radius } = useKinetikTheme();
  const digits = String(Math.max(0, value)).slice(-DIGITS);
  const lit = useMemo(() => Skia.Path.MakeFromSVGString(segmentPath(digits)), [digits]);
  const ghost = useMemo(() => Skia.Path.MakeFromSVGString(segmentPath('8'.repeat(DIGITS))), []);
  const offset = (DIGITS - digits.length) * 13 * LCD_SCALE;
  return (
    <View style={[styles.lcdFrame, { borderRadius: radius.xs + 2 }]}>
      <View style={[styles.lcd, gradient(LCD), { borderRadius: radius.xs - 1 }]}>
        <Canvas style={styles.lcdDigits}>
          <Group transform={[{ scale: LCD_SCALE }]}>
            {ghost ? <Path path={ghost} color={LCD_GHOST} /> : null}
          </Group>
          <Group transform={[{ translateX: offset }, { scale: LCD_SCALE }]}>
            {lit ? <Path path={lit} color={LCD_INK} /> : null}
          </Group>
        </Canvas>
        <Text
          style={{
            color: LCD_INK,
            fontSize: font.size.xs - 3,
            fontWeight: font.weight.bold,
            alignSelf: 'flex-end',
          }}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

const LCD_SCALE = 1.15;
const MUTED = 'hsl(214, 10%, 62%)';
const RIM_RED = 'hsl(356, 78%, 52%)';
const RIM_GREY = 'hsl(214, 8%, 58%)';
const RIM_FADE = 'hsla(214, 8%, 20%, 0.25)';
const LCD_INK = 'hsl(90, 30%, 12%)';
const LCD_GHOST = 'hsla(90, 30%, 12%, 0.1)';
const LCD = 'linear-gradient(180deg, hsl(78, 26%, 54%) 0%, hsl(72, 34%, 68%) 100%)';
const BACKDROP =
  'linear-gradient(180deg, hsl(220, 12%, 10%) 0%, hsl(214, 24%, 14%) 62%, hsl(220, 12%, 7%) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'space-between',
    boxShadow: '0px 18px 40px hsla(220, 30%, 5%, 0.3)',
  },
  fill: { position: 'absolute', top: 0, left: 0 },
  scale: { position: 'absolute' },
  mark: { position: 'absolute', width: 48, height: 16, alignItems: 'center' },
  needle: {
    position: 'absolute',
    width: 3,
    borderRadius: 1.5,
    backgroundColor: 'hsl(36, 92%, 54%)',
  },
  needleTip: { height: 14, borderRadius: 1.5, backgroundColor: 'hsl(356, 78%, 52%)' },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  end: { alignItems: 'flex-end', flexShrink: 1 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'hsl(214, 16%, 22%)',
  },
  lcdWrap: { alignItems: 'center' },
  lcdFrame: { padding: 4, backgroundColor: 'hsl(214, 6%, 30%)' },
  lcd: { flexDirection: 'row', gap: 3, paddingHorizontal: 6, paddingVertical: 4 },
  lcdDigits: { width: (DIGITS * 13 - 3) * LCD_SCALE, height: 18 * LCD_SCALE },
});
