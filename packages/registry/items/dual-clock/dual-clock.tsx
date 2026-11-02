import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type DualClockZone = {
  /** Short city code in the middle of the face, e.g. "TYO". */
  code: string;
  /** Hours from UTC, e.g. 9 or -5. */
  offset: number;
  /** Day face (white) or night face (black). Defaults to following the hour. */
  face?: 'day' | 'night';
};

export type DualClockProps = {
  /** Two time zones, one per face. */
  zones: [DualClockZone, DualClockZone];
  /** A fixed moment to show. Leave it out and the clocks run live. */
  time?: Date;
  /** Offset of the viewer's zone, used for the "+3" under each code. Defaults to the device's. */
  homeOffset?: number;
  style?: StyleProp<ViewStyle>;
};

const SIZE = 96;
const R = SIZE / 2;
const MINUTE_MS = 60_000;

export type HandAngles = { hour: number; minute: number; second: number };

/** Hand angles in degrees clockwise from twelve, for a moment in a zone. */
export function handAngles(date: Date, offset: number): HandAngles {
  const ms = date.getTime() + offset * 3_600_000;
  const inMinute = ((ms % MINUTE_MS) + MINUTE_MS) % MINUTE_MS;
  const inHour = ((ms % 3_600_000) + 3_600_000) % 3_600_000;
  const inHalfDay = ((ms % 43_200_000) + 43_200_000) % 43_200_000;
  return {
    second: (inMinute / MINUTE_MS) * 360,
    minute: (inHour / 3_600_000) * 360,
    hour: (inHalfDay / 43_200_000) * 360,
  };
}

/** The zone's local hour and minute as text, for screen readers. */
export function clockText(date: Date, offset: number): string {
  const d = new Date(date.getTime() + offset * 3_600_000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatOffset(hours: number) {
  if (hours === 0) return 'same';
  return `${hours > 0 ? '+' : ''}${hours}`;
}

/** Whether the zone's local time is in the daytime. */
function isDay(date: Date, offset: number) {
  const hour = new Date(date.getTime() + offset * 3_600_000).getUTCHours();
  return hour >= 6 && hour < 18;
}

/**
 * Two world clocks side by side, one light and one dark. The hands run
 * continuously on the UI thread, so nothing re-renders while they turn. Reduced
 * motion drops the second hand and moves the others once a minute.
 */
export function DualClock({ zones, time, homeOffset, style }: DualClockProps) {
  const reduced = useReduceMotion();
  const [opened] = useState(() => new Date());
  const [minuteTick, setMinuteTick] = useState(() => new Date());
  const fixed = time != null;

  useEffect(() => {
    if (fixed) return;
    // Keeps the spoken time current, and moves the hands under reduced motion.
    const id = setInterval(() => setMinuteTick(new Date()), MINUTE_MS);
    return () => clearInterval(id);
  }, [fixed]);

  const shown = time ?? minuteTick;
  const home = homeOffset ?? -opened.getTimezoneOffset() / 60;

  return (
    <View
      accessible
      accessibilityLabel={zones.map((z) => `${z.code} ${clockText(shown, z.offset)}`).join(', ')}
      style={[styles.card, style]}
    >
      {zones.map((zone) => (
        <Face
          key={zone.code}
          zone={zone}
          angles={handAngles(reduced || fixed ? shown : opened, zone.offset)}
          still={reduced || fixed}
          showSeconds={!reduced}
          note={formatOffset(zone.offset - home)}
          dark={(zone.face ?? (isDay(shown, zone.offset) ? 'day' : 'night')) === 'night'}
        />
      ))}
    </View>
  );
}

function Face({
  zone,
  angles,
  still,
  showSeconds,
  note,
  dark,
}: {
  zone: DualClockZone;
  angles: HandAngles;
  still: boolean;
  showSeconds: boolean;
  note: string;
  dark: boolean;
}) {
  const { font } = useKinetikTheme();
  const ink = dark ? INK_NIGHT : INK_DAY;
  const ticks = useMemo(() => {
    const major = Skia.PathBuilder.Make();
    const minor = Skia.PathBuilder.Make();
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180;
      const isMajor = i % 5 === 0;
      const inner = R - (isMajor ? 9 : 5);
      const b = isMajor ? major : minor;
      b.moveTo(R + Math.sin(a) * inner, R - Math.cos(a) * inner);
      b.lineTo(R + Math.sin(a) * (R - 2), R - Math.cos(a) * (R - 2));
    }
    return { major: major.detach(), minor: minor.detach() };
  }, []);

  return (
    <View style={[styles.face, { backgroundColor: dark ? FACE_NIGHT : FACE_DAY }]}>
      <Canvas style={styles.dial}>
        <Path path={ticks.minor} style="stroke" strokeWidth={0.8} color={ink} opacity={0.5} />
        <Path path={ticks.major} style="stroke" strokeWidth={1.6} color={ink} />
      </Canvas>
      <View style={styles.center}>
        <Text style={{ color: ink, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
          {zone.code}
        </Text>
        <Text style={{ color: ink, fontSize: font.size.xs - 2, opacity: 0.7 }}>{note}</Text>
      </View>
      <Hand
        angle={angles.hour}
        periodMs={43_200_000}
        still={still}
        length={R * 0.48}
        width={4}
        color={ink}
      />
      <Hand
        angle={angles.minute}
        periodMs={3_600_000}
        still={still}
        length={R * 0.72}
        width={3}
        color={ink}
      />
      {showSeconds ? (
        <Hand
          angle={angles.second}
          periodMs={MINUTE_MS}
          still={still}
          length={R * 0.82}
          width={1.2}
          color={SECOND}
        />
      ) : null}
      <View style={[styles.pin, { backgroundColor: SECOND }]} />
    </View>
  );
}

function Hand({
  angle,
  periodMs,
  still,
  length,
  width,
  color,
}: {
  angle: number;
  periodMs: number;
  still: boolean;
  length: number;
  width: number;
  color: string;
}) {
  const turn: SharedValue<number> = useSharedValue(angle);

  useEffect(() => {
    if (still) {
      turn.set(angle);
      return;
    }
    // One sweep from here; withRepeat restarts at `angle`, which is the same place on the dial.
    turn.set(angle);
    turn.set(
      withRepeat(
        withTiming(angle + 360, { duration: periodMs, easing: easings.linear }),
        -1,
        false,
      ),
    );
  }, [angle, periodMs, still, turn]);

  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <Animated.View pointerEvents="none" style={[styles.handBox, rotate]}>
      <View
        style={{
          position: 'absolute',
          left: R - width / 2,
          top: R - length,
          width,
          height: length + 6,
          borderRadius: width / 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

const FACE_DAY = 'hsl(40, 12%, 96%)';
const FACE_NIGHT = 'hsl(220, 6%, 8%)';
const INK_DAY = 'hsl(220, 10%, 10%)';
const INK_NIGHT = 'hsl(0, 0%, 94%)';
const SECOND = 'hsl(6, 88%, 54%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
    padding: 16,
  },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: R,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.16)',
    overflow: 'hidden',
  },
  dial: { position: 'absolute', top: -1, left: -1, width: SIZE, height: SIZE },
  center: {
    position: 'absolute',
    top: R * 0.36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  handBox: { position: 'absolute', top: -1, left: -1, width: SIZE, height: SIZE },
  pin: {
    position: 'absolute',
    top: R - 4.5,
    left: R - 4.5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
