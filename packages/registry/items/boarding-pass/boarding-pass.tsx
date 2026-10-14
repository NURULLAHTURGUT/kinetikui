import {
  BlurMask,
  Canvas,
  DashPathEffect,
  Group,
  Line,
  Path,
  PathOp,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { palettes, withAlpha } from '../../shared/tokens/tokens';

export type PassStop = {
  /** Airport code, e.g. "CDG". */
  code: string;
  /** City above the code. */
  city: string;
  /** Local time under the code. */
  time: string;
};

export type PassDetail = { label: string; value: string };

export type BoardingPassProps = {
  /** Name and mark at the top. Defaults to "Kinetik Air". */
  brand?: string;
  airline: string;
  /** Flight number under the airline. */
  flight: string;
  /** Cabin on the right, e.g. "Premium". */
  cabin?: string;
  /** Booking reference under the cabin. */
  booking?: string;
  from: PassStop;
  to: PassStop;
  /** Flight time in the chip between the codes, e.g. "3h 15m". */
  duration: string;
  passenger: string;
  /** Label above the passenger. Defaults to "Passenger name". */
  passengerLabel?: string;
  /** The row of small facts: departure, terminal, gate, seat. */
  details: readonly PassDetail[];
  /** Encoded in the barcode's pattern. Defaults to the booking and flight. */
  code?: string;
  /** Start already boarded: the stub torn and stamped. */
  boarded?: boolean;
  /** Called when the barcode is tapped and scanned. Without it the stub is not a button. */
  onScan?: () => void;
  /** Colour of the striped band. */
  accent?: string;
  /** Haptics on scan. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const BAND = 56;
const CORNER = 20;
const NOTCH = 14;
const STUB_H = 112;
const STRIPE = 22;
/** The barcode's box inside the stub. */
const BAR_X = 36;
const BAR_TOP = 26;
const BAR_BOTTOM = STUB_H - 22;

/**
 * Plane from Tabler Icons (MIT, https://tabler.io/icons), nose right on a 24 pt grid. The small
 * icons are SVG: a Skia canvas each would be a GPU surface apiece for a few pixels.
 */
const PLANE = 'M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z';
const MARK = 'M0 0h8l8 7-8 7H0l6-7z';

function rectPath(x: number, y: number, w: number, h: number) {
  return Skia.PathBuilder.Make()
    .addRect(Skia.XYWHRect(x, y, w, h))
    .detach();
}
function roundPath(x: number, y: number, w: number, h: number, r: number) {
  return Skia.PathBuilder.Make()
    .addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r))
    .detach();
}
function notches(w: number, y: number) {
  return Skia.PathBuilder.Make().addCircle(0, y, NOTCH).addCircle(w, y, NOTCH).detach();
}
/** Rounds the corners at one end only, and bites the half circles out of the other. */
function ticketPart(w: number, h: number, roundTop: boolean, top: number) {
  const tall = roundPath(0, roundTop ? top : -CORNER * 2, w, h - top + CORNER * 2, CORNER);
  const cut = Skia.Path.MakeFromOp(tall, rectPath(0, top, w, h - top), PathOp.Intersect) ?? tall;
  return Skia.Path.MakeFromOp(cut, notches(w, roundTop ? h : 0), PathOp.Difference) ?? cut;
}

/** A stable bar pattern for a code: the same text always draws the same barcode. */
export function barcodeBars(code: string, count = 46): number[] {
  let h = 2166136261;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= code.charCodeAt(i % Math.max(1, code.length)) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bars.push(1 + (h % 3));
  }
  return bars;
}

/**
 * A boarding pass on paper with real notches cut at the tear line. The striped
 * band slides in as the pass rises; tapping the barcode runs a scanner line
 * over it, then the stub tears a little away and takes a Boarded stamp.
 */
export function BoardingPass({
  brand = 'Kinetik Air',
  airline,
  flight,
  cabin,
  booking,
  from,
  to,
  duration,
  passenger,
  passengerLabel = 'Passenger name',
  details,
  code,
  boarded = false,
  onScan,
  accent = 'hsl(243, 88%, 68%)',
  haptics = true,
  style,
}: BoardingPassProps) {
  const { font, space } = useKinetikTheme();
  // A pass is paper on either theme.
  const paper = palettes.light;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [scanned, setScanned] = useState(boarded);

  const rise = useSharedValue(reduced ? 1 : 0);
  const slide = useSharedValue(reduced ? 1 : 0);
  const sweep = useSharedValue(0);
  const tear = useSharedValue(boarded ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    rise.set(withSpring(1, spring('smooth')));
    slide.set(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [reduced, rise, slide]);

  const scan = () => {
    if (scanned) return;
    setScanned(true);
    onScan?.();
    if (reduced) {
      tear.set(1);
      haptic('success');
      return;
    }
    haptic('tap');
    sweep.set(0);
    sweep.set(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }));
    tear.set(withDelay(820, withSpring(1, spring('bouncy'))));
    setTimeout(() => haptic('success'), 820);
  };

  const body = useMemo(
    () => (width > 0 && height > 0 ? ticketPart(width, height, true, BAND) : null),
    [width, height],
  );
  const band = useMemo(
    () => (width > 0 ? roundPath(0, 0, width, BAND + CORNER * 2, CORNER) : null),
    [width],
  );
  const stripes = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    if (width <= 0) return b.detach();
    // Diagonal bars from well left of the band, so the slide never shows an edge.
    for (let x = -STRIPE * 8; x < width + BAND; x += STRIPE) {
      b.moveTo(x, BAND + CORNER)
        .lineTo(x + STRIPE / 2, BAND + CORNER)
        .lineTo(x + STRIPE / 2 + BAND + CORNER, 0)
        .lineTo(x + BAND + CORNER, 0)
        .close();
    }
    return b.detach();
  }, [width]);
  const drift = useDerivedValue(() => [{ translateX: (1 - slide.get()) * -STRIPE * 6 }]);

  const lift = useAnimatedStyle(() => ({
    opacity: rise.get(),
    transform: [{ translateY: (1 - rise.get()) * 28 }],
  }));

  const ink = paper.text;
  const muted = paper.textSubtle;
  const label = (text: string, align: 'left' | 'right' = 'left') => (
    <Text style={{ color: muted, fontSize: font.size.sm, textAlign: align }}>{text}</Text>
  );
  const rule = <View style={[styles.rule, { backgroundColor: paper.border }]} />;

  return (
    <Animated.View style={[styles.pass, style, lift]}>
      <View
        accessible
        accessibilityLabel={[
          `Boarding pass, ${brand}`,
          `${airline} flight ${flight}${cabin ? `, ${cabin}` : ''}`,
          `${from.city} ${from.code} ${from.time} to ${to.city} ${to.code} ${to.time}, ${duration}`,
          `${passengerLabel} ${passenger}`,
          details.map((d) => `${d.label} ${d.value}`).join(', '),
        ].join('. ')}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width);
          setHeight(e.nativeEvent.layout.height);
        }}
        style={{
          paddingTop: BAND + space[5],
          paddingHorizontal: space[5],
          paddingBottom: space[5],
        }}
      >
        {body && band ? (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Group clip={band}>
              <Path path={band} color={accent} />
              <Group transform={drift}>
                <Path path={stripes} color={withAlpha(paper.text, 0.86)} />
              </Group>
            </Group>
            <Path path={body} color={paper.surfaceRaised} />
          </Canvas>
        ) : null}

        <View style={[styles.row, { gap: 8 }]}>
          <Svg width={16} height={14} viewBox="0 0 16 14" pointerEvents="none">
            <SvgPath d={MARK} fill={ink} />
          </Svg>
          <Text style={{ color: ink, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
            {brand}
          </Text>
        </View>

        <View style={[styles.split, { marginTop: space[4] }]}>
          <View>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={[styles.logo, { backgroundColor: accent }]} />
              <Text style={{ color: ink, fontSize: font.size.md - 1 }}>{airline}</Text>
            </View>
            {label(flight)}
          </View>
          {cabin || booking ? (
            <View style={styles.end}>
              {cabin ? (
                <Text style={{ color: ink, fontSize: font.size.md - 1 }}>{cabin}</Text>
              ) : null}
              {booking ? label(booking, 'right') : null}
            </View>
          ) : null}
        </View>

        {rule}

        <View style={[styles.split, { alignItems: 'flex-end' }]}>
          <View>
            {label(from.city)}
            <Text style={[styles.code, { color: ink }]}>{from.code}</Text>
            <Text style={[styles.time, { color: withAlpha(paper.text, 0.4) }]}>{from.time}</Text>
          </View>
          <View
            style={[
              styles.chip,
              { backgroundColor: withAlpha(paper.azure, 0.12), marginBottom: 28 },
            ]}
          >
            <Svg width={12} height={12} viewBox="0 0 24 24" pointerEvents="none">
              <SvgPath
                d={PLANE}
                fill="none"
                stroke={ink}
                strokeWidth={2.2}
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={{ color: ink, fontSize: 11, fontWeight: font.weight.medium }}>
              {duration}
            </Text>
          </View>
          <View style={styles.end}>
            {label(to.city, 'right')}
            <Text style={[styles.code, { color: ink }]}>{to.code}</Text>
            <Text style={[styles.time, { color: withAlpha(paper.text, 0.4) }]}>{to.time}</Text>
          </View>
        </View>

        {rule}

        {label(passengerLabel)}
        <Text
          style={{
            color: ink,
            fontSize: font.size.xl,
            fontWeight: font.weight.medium,
            marginTop: 2,
          }}
        >
          {passenger}
        </Text>

        {rule}

        <View style={styles.split}>
          {details.map((d) => (
            <View key={d.label}>
              {label(d.label)}
              <Text
                style={{
                  color: ink,
                  fontSize: font.size.xl,
                  fontWeight: font.weight.medium,
                  marginTop: 2,
                }}
              >
                {d.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Stub
        width={width}
        code={code ?? `${booking ?? ''}${flight}`}
        scanned={scanned}
        interactive={!!onScan}
        sweep={sweep}
        tear={tear}
        onPress={scan}
      />
    </Animated.View>
  );
}

function Stub({
  width,
  code,
  scanned,
  interactive,
  sweep,
  tear,
  onPress,
}: {
  width: number;
  code: string;
  scanned: boolean;
  interactive: boolean;
  sweep: SharedValue<number>;
  tear: SharedValue<number>;
  onPress: () => void;
}) {
  const { font } = useKinetikTheme();
  const paper = palettes.light;
  const shape = useMemo<SkPath | null>(
    () => (width > 0 ? ticketPart(width, STUB_H, false, 0) : null),
    [width],
  );
  const bars = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    if (width <= 0) return b.detach();
    const pattern = barcodeBars(code);
    const total = pattern.reduce((s, n) => s + n * 2, 0);
    const unit = (width - BAR_X * 2) / total;
    let x = BAR_X;
    pattern.forEach((n, i) => {
      // Alternate thick and thin bars for a little rhythm.
      const w = unit * (i % 4 === 0 ? n + 0.6 : n * 0.7);
      b.addRect(Skia.XYWHRect(x, BAR_TOP, w, BAR_BOTTOM - BAR_TOP));
      x += unit * n * 2;
    });
    return b.detach();
  }, [width, code]);

  const laserY = useDerivedValue(() => {
    const s = sweep.get();
    const t = s < 0.5 ? s * 2 : 2 - s * 2;
    return BAR_TOP + (BAR_BOTTOM - BAR_TOP) * t;
  });
  // The line itself stays put and its group moves, so the blurred glow is one cached mask.
  const laserAt = useDerivedValue(() => [{ translateY: laserY.get() }]);
  const laserOn = useDerivedValue(() => (sweep.get() > 0 && sweep.get() < 1 ? 1 : 0));

  const torn = useAnimatedStyle(() => ({
    transform: [{ translateY: tear.get() * 8 }, { rotate: `${tear.get() * 2.2}deg` }],
  }));
  const stamp = useAnimatedStyle(() => ({
    opacity: tear.get() > 0.02 ? Math.min(1, tear.get() * 1.5) : 0,
    transform: [{ scale: 1.6 - Math.min(1, tear.get()) * 0.6 }, { rotate: '-8deg' }],
  }));

  return (
    <Animated.View style={[styles.stub, { transformOrigin: 'left top' }, torn]}>
      {shape ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path path={shape} color={paper.surfaceRaised} />
          <Line
            p1={vec(NOTCH + 8, 0.5)}
            p2={vec(width - NOTCH - 8, 0.5)}
            color={paper.borderStrong}
            strokeWidth={1}
          >
            <DashPathEffect intervals={[5, 4]} />
          </Line>
          <Group opacity={scanned ? 0.35 : 1}>
            <Path path={bars} color={paper.text} />
          </Group>
          <Group opacity={laserOn} transform={laserAt}>
            <Line
              p1={vec(BAR_X - 10, 0)}
              p2={vec(width - BAR_X + 10, 0)}
              color={paper.danger}
              strokeWidth={6}
            >
              <BlurMask blur={5} style="normal" />
            </Line>
            <Line
              p1={vec(BAR_X - 10, 0)}
              p2={vec(width - BAR_X + 10, 0)}
              color={paper.danger}
              strokeWidth={1.5}
            />
          </Group>
        </Canvas>
      ) : null}
      <Pressable
        accessibilityRole={interactive ? 'button' : undefined}
        accessibilityLabel={scanned ? 'Boarded' : 'Barcode'}
        accessibilityHint={interactive && !scanned ? 'Scans the boarding pass' : undefined}
        accessibilityState={interactive ? { disabled: scanned } : undefined}
        disabled={!interactive || scanned}
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stamp,
          { borderColor: paper.success, backgroundColor: paper.surfaceRaised },
          stamp,
        ]}
      >
        <View style={[styles.tick, { borderColor: paper.success }]} />
        <Text
          style={{
            color: paper.success,
            fontSize: font.size.sm,
            fontWeight: font.weight.bold,
            letterSpacing: 1.5,
          }}
        >
          BOARDED
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pass: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { alignItems: 'flex-end' },
  logo: { width: 14, height: 14, borderRadius: 7 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  code: { fontSize: 32, lineHeight: 36, fontWeight: '500', letterSpacing: -0.5 },
  time: { fontSize: 28, lineHeight: 32, fontWeight: '500', letterSpacing: -0.5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 11,
  },
  stub: { height: STUB_H },
  stamp: {
    position: 'absolute',
    alignSelf: 'center',
    top: STUB_H / 2 - 18,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
  },
  tick: {
    width: 12,
    height: 6,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    marginTop: -3,
    transform: [{ rotate: '-45deg' }],
  },
});
