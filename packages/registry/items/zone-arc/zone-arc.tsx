import {
  Canvas,
  Group,
  Path,
  RoundedRect,
  Skia,
  type SkPath,
  type SkRect,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ArcZone = {
  /** Upper end of the zone. The next zone starts here. */
  to: number;
  /** Colour of the zone. */
  color: string;
};

export type ZoneArcProps = {
  value: number;
  /** Where the arc starts. */
  min: number;
  /** The zones in order. The last one's `to` is the end of the arc. */
  zones: ArcZone[];
  /** Unit after the value, e.g. "AQI". */
  unit?: string;
  /** When it was read, e.g. "4 min ago". */
  ago?: string;
  style?: StyleProp<ViewStyle>;
};

const H = 84;
const THICK = 30;
/** Arc span: from 180° on the left over the top to 360° on the right. */
const START = 180;
const SWEEP = 180;
const GAP_DEG = 1.2;

/** Fraction of the arc (0–1) for a value. */
export function arcFraction(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Index of the zone holding a value. */
export function zoneIndex(value: number, zones: ArcZone[]): number {
  const i = zones.findIndex((z) => value < z.to);
  return i < 0 ? zones.length - 1 : i;
}

/** One arc path per zone, with the stretch of the dial each one covers. */
function zoneParts(zones: ArcZone[], min: number, max: number, box: SkRect) {
  const parts = [];
  let from = 0;
  for (const zone of zones) {
    const to = arcFraction(zone.to, min, max);
    const path = Skia.PathBuilder.Make()
      .addArc(box, START + from * SWEEP + GAP_DEG / 2, (to - from) * SWEEP - GAP_DEG)
      .detach();
    parts.push({ path, from, to, color: zone.color });
    from = to;
  }
  return parts;
}

/**
 * A reading on a half dial of coloured zones: the zones sweep in around the arc, a
 * white marker swings to the value, and the zone it lands in lights up.
 */
export function ZoneArc({ value, min, zones, unit, ago, style }: ZoneArcProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const shown = Math.round(useCountUp(value, { instant: reduced }));
  const active = zoneIndex(value, zones);

  return (
    <View
      accessible
      accessibilityLabel={`${value}${unit ? ` ${unit}` : ''}, zone ${active + 1} of ${zones.length}${ago ? `, ${ago}` : ''}`}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {shown}
          {unit ? <Text style={{ fontSize: font.size.xs }}> {unit}</Text> : null}
        </Text>
        {ago ? <Text style={{ color: MUTED, fontSize: font.size.xs }}>{ago}</Text> : null}
      </View>
      <View
        testID="zone-arc-dial"
        style={styles.dial}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Dial width={width} value={value} min={min} zones={zones} active={active} />
        ) : null}
      </View>
    </View>
  );
}

function Dial({
  width,
  value,
  min,
  zones,
  active,
}: {
  width: number;
  value: number;
  min: number;
  zones: ArcZone[];
  active: number;
}) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const max = zones[zones.length - 1]?.to ?? min + 1;
  const target = arcFraction(value, min, max);
  const reveal = useSharedValue(reduced ? 1 : 0);
  const at = useSharedValue(reduced ? target : 0);

  useEffect(() => {
    if (!reduced) reveal.set(withTiming(1, { duration: 700, easing: easings.standard }));
  }, [reduced, reveal]);

  useEffect(() => {
    at.set(reduced ? target : withSpring(target, spring('smooth')));
  }, [target, reduced, at]);

  const radius = Math.min(width / 2 - THICK / 2, H * 1.5);
  const cx = width / 2;
  const cy = radius + THICK / 2;
  const box = useMemo(
    () => ({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }),
    [cx, cy, radius],
  );

  const parts = useMemo(() => zoneParts(zones, min, max, box), [zones, min, max, box]);

  const marker = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { rotate: ((START + at.get() * SWEEP) * Math.PI) / 180 },
  ]);

  return (
    <>
      <Canvas style={{ width, height: H }}>
        {parts.map((part, i) => (
          <Zone key={i} {...part} lit={i === active} reveal={reveal} />
        ))}
        <Group transform={marker}>
          <RoundedRect
            x={radius - THICK / 2 - 3}
            y={-3.5}
            width={THICK + 6}
            height={7}
            r={3.5}
            color={colors.highlight}
          />
        </Group>
      </Canvas>
      {parts.slice(0, -1).map((part) => {
        const a = ((START + part.to * SWEEP) * Math.PI) / 180;
        const r = radius - THICK / 2 - 10;
        return (
          <Text
            key={part.to}
            style={[
              styles.mark,
              {
                left: cx + Math.cos(a) * r - 16,
                top: cy + Math.sin(a) * r - 7,
                transform: [{ rotate: `${(part.to - 0.5) * SWEEP}deg` }],
              },
            ]}
          >
            {Math.round(min + part.to * (max - min))}
          </Text>
        );
      })}
    </>
  );
}

function Zone({
  path,
  from,
  to,
  color,
  lit,
  reveal,
}: {
  path: SkPath;
  from: number;
  to: number;
  color: string;
  lit: boolean;
  reveal: SharedValue<number>;
}) {
  const end = useDerivedValue(() =>
    Math.max(0, Math.min(1, (reveal.get() - from) / Math.max(0.001, to - from))),
  );
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={THICK}
      color={color}
      opacity={lit ? 1 : 0.3}
      end={end}
    />
  );
}

const MUTED = 'hsl(0, 0%, 62%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dial: { height: H },
  mark: { position: 'absolute', width: 32, textAlign: 'center', fontSize: 10, color: MUTED },
});
