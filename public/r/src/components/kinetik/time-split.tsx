import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type TimeSplitItem = {
  label: string;
  minutes: number;
  /** Colour of the segment and its square. Defaults to a rotation. */
  color?: string;
};

export type TimeSplitProps = {
  title: string;
  /** Up to about six items. The total is their sum. */
  items: TimeSplitItem[];
  /** Label under the hours. Defaults to "Hours". */
  hoursLabel?: string;
  /** Label under the minutes. Defaults to "Minutes". */
  minutesLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const ROTATION = [
  'hsl(2, 80%, 66%)',
  'hsl(216, 76%, 58%)',
  'hsl(192, 70%, 62%)',
  'hsl(248, 66%, 68%)',
  'hsl(150, 70%, 42%)',
  'hsl(220, 8%, 46%)',
];

const CURVE = 30;
const RIM = 5;
const RIM_BOX = CURVE + RIM + 2;
/** Space between segments, in points along the rim. */
const GAP = 7;

/** Fractions of the rim for each item: where it starts and ends, gaps taken out. */
export function rimSegments(minutes: number[], length: number): [number, number][] {
  const total = minutes.reduce((sum, m) => sum + Math.max(0, m), 0) || 1;
  const gap = length > 0 ? GAP / length : 0;
  let at = 0;
  return minutes.map((m) => {
    const start = at + gap / 2;
    at += Math.max(0, m) / total;
    return [start, Math.max(start, at - gap / 2)];
  });
}

function spokenTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m || !h) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

/**
 * A raised panel showing a total time, with the share of each activity as
 * coloured segments running along the panel's curved bottom edge. Segments glide
 * to their new lengths when the numbers change, and the time counts.
 */
export function TimeSplit({
  title,
  items,
  hoursLabel = 'Hours',
  minutesLabel = 'Minutes',
  style,
}: TimeSplitProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const total = items.reduce((sum, i) => sum + Math.max(0, i.minutes), 0);
  const shown = Math.round(useCountUp(total, { instant: reduced }));
  const hours = String(Math.floor(shown / 60)).padStart(2, '0');
  const mins = String(shown % 60).padStart(2, '0');

  const colorOf = (i: number) => items[i]?.color ?? ROTATION[i % ROTATION.length]!;
  const rim = useMemo(() => {
    if (!width) return null;
    const edge = RIM / 2;
    const bottom = CURVE + edge;
    return Skia.Path.MakeFromSVGString(
      `M${edge} 0C${edge} ${CURVE * 0.6} ${CURVE * 0.45} ${bottom} ${CURVE + edge} ${bottom}` +
        `H${width - CURVE - edge}` +
        `C${width - CURVE * 0.45} ${bottom} ${width - edge} ${CURVE * 0.6} ${width - edge} 0`,
    );
  }, [width]);
  // The straight part plus two corners, close enough to size the gaps evenly.
  const length = width - 2 * CURVE + 3 * CURVE;
  const segments = rimSegments(
    items.map((i) => i.minutes),
    length,
  );
  const half = Math.ceil(items.length / 2);
  const spoken = items.map((i) => `${i.label} ${spokenTime(i.minutes)}`).join(', ');

  return (
    <View
      accessible
      accessibilityLabel={`${title}: ${spokenTime(total)}. ${spoken}.`}
      style={[styles.card, { borderColor: withAlpha(colors.highlight, 0.08) }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.glow,
          gradient(`linear-gradient(100deg, ${colorOf(0)} 0%, transparent 46%)`),
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.glow,
          gradient(`linear-gradient(260deg, ${colorOf(2)} 0%, transparent 46%)`),
        ]}
      />
      <View style={styles.raised}>
        <View style={[styles.panel, gradient(PANEL), { paddingTop: space[5] }]}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.highlight,
              fontSize: font.size.lg - 1,
              fontWeight: font.weight.medium,
            }}
          >
            {title}
          </Text>
          <View style={[styles.time, { marginTop: space[1] }]}>
            <Unit value={hours} label={hoursLabel} />
            <Text
              style={[
                styles.colon,
                {
                  color: DIGIT,
                  fontSize: font.size['3xl'] - 4,
                  fontWeight: font.weight.semibold,
                },
              ]}
            >
              :
            </Text>
            <Unit value={mins} label={minutesLabel} />
          </View>
        </View>
        {rim ? (
          <Canvas style={{ ...styles.rim, width }} pointerEvents="none">
            {items.map((item, i) => (
              <RimSegment
                key={item.label}
                path={rim}
                color={colorOf(i)}
                from={segments[i]![0]}
                to={segments[i]![1]}
              />
            ))}
          </Canvas>
        ) : null}
      </View>

      <View style={[styles.legend, { padding: space[5], paddingTop: space[3], gap: space[3] }]}>
        {[items.slice(0, half), items.slice(half)].map((column, c) => (
          <View key={c} style={[styles.column, { gap: space[1.5] }]}>
            {column.map((item, i) => (
              <View key={item.label} style={[styles.entry, { gap: space[2] }]}>
                <View
                  style={[
                    styles.square,
                    {
                      backgroundColor: colorOf(c === 0 ? i : half + i),
                      borderRadius: radius.xs / 2,
                    },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.grow, { color: LEGEND, fontSize: font.size.sm }]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  const { font } = useKinetikTheme();
  return (
    <View style={styles.unit}>
      <Text
        style={{
          color: DIGIT,
          fontSize: font.size['3xl'] + 2,
          fontWeight: font.weight.semibold,
          fontVariant: ['tabular-nums'],
          lineHeight: 42,
        }}
      >
        {value}
      </Text>
      <Text style={{ color: DIGIT, fontSize: font.size.sm }}>{label}</Text>
    </View>
  );
}

/** One coloured stretch of the rim. It grows out from the left on arrival. */
function RimSegment({
  path,
  color,
  from,
  to,
}: {
  path: SkPath;
  color: string;
  from: number;
  to: number;
}) {
  const reduced = useReduceMotion();
  const start = useSharedValue(reduced ? from : 0);
  const end = useSharedValue(reduced ? to : 0);

  useEffect(() => {
    start.set(reduced ? from : withSpring(from, spring('smooth')));
    end.set(reduced ? to : withSpring(to, spring('smooth')));
  }, [from, to, reduced, start, end]);

  // A stretch of no length would still draw its round caps.
  const opacity = useDerivedValue(() => (end.get() - start.get() > 0.002 ? 1 : 0));

  return (
    <Path
      path={path}
      color={color}
      style="stroke"
      strokeWidth={RIM}
      strokeCap="round"
      start={start}
      end={end}
      opacity={opacity}
    />
  );
}

const DIGIT = 'hsl(216, 34%, 86%)';
const LEGEND = 'hsl(216, 20%, 80%)';
const PANEL =
  'linear-gradient(180deg, hsla(215, 12%, 34%, 0.72) 0%, hsla(218, 10%, 22%, 0.96) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 38,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'hsl(222, 12%, 13%)',
    boxShadow: '0px 22px 48px hsla(222, 40%, 4%, 0.42)',
  },
  glow: { opacity: 0.22 },
  raised: { paddingBottom: RIM + 2 },
  panel: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomLeftRadius: CURVE,
    borderBottomRightRadius: CURVE,
  },
  rim: { position: 'absolute', left: 0, bottom: 0, height: RIM_BOX },
  time: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 22 },
  unit: { alignItems: 'center', minWidth: 62 },
  colon: { lineHeight: 38 },
  legend: { flexDirection: 'row' },
  column: { flex: 1 },
  entry: { flexDirection: 'row', alignItems: 'center' },
  square: { width: 10, height: 10 },
  grow: { flex: 1 },
});
