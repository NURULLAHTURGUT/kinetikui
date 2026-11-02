import { Canvas, Path, RadialGradient, Circle, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type CompassArcProps = {
  /** Heading in degrees, 0 is north. */
  heading: number;
  /** Small line over the heading, e.g. "12M". */
  note?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE = 288;
const R = SIZE / 2;
const WINDOW_H = 116;
const LABEL_R = R - 34;

const LABELS: { at: number; text: string; strong?: boolean }[] = [
  { at: 0, text: 'N', strong: true },
  { at: 30, text: '30' },
  { at: 60, text: '60' },
  { at: 90, text: 'E', strong: true },
  { at: 120, text: '120' },
  { at: 150, text: '150' },
  { at: 180, text: 'S', strong: true },
  { at: 210, text: '210' },
  { at: 240, text: '240' },
  { at: 270, text: 'W', strong: true },
  { at: 300, text: '300' },
  { at: 330, text: '330' },
];

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** The eight-point name of a heading. */
export function cardinal(heading: number): string {
  const wrapped = ((heading % 360) + 360) % 360;
  return CARDINALS[Math.round(wrapped / 45) % 8]!;
}

/** The turn nearest `from` that points at `heading`, so 350° to 10° goes through north. */
export function nearestTurn(from: number, heading: number): number {
  const delta = ((((heading - from) % 360) + 540) % 360) - 180;
  return from + delta;
}

/**
 * A compass bezel rising from the bottom edge: the numbered dial turns under a
 * fixed red pointer the short way round and settles with a soft spring.
 */
export function CompassArc({ heading, note, style }: CompassArcProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const turn = useSharedValue(reduced ? heading : heading - 50);
  const wrapped = ((Math.round(heading) % 360) + 360) % 360;

  useEffect(() => {
    const to = nearestTurn(turn.get(), heading);
    turn.set(reduced ? to : withSpring(to, spring('smooth')));
  }, [heading, reduced, turn]);

  const dial = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.get()}deg` }] }));

  const ticks = useMemo(() => {
    const major = Skia.PathBuilder.Make();
    const minor = Skia.PathBuilder.Make();
    for (let deg = 0; deg < 360; deg += 5) {
      const a = (deg * Math.PI) / 180;
      const isMajor = deg % 30 === 0;
      const b = isMajor ? major : minor;
      const inner = R - (isMajor ? 16 : 9);
      b.moveTo(R + Math.sin(a) * inner, R - Math.cos(a) * inner);
      b.lineTo(R + Math.sin(a) * (R - 3), R - Math.cos(a) * (R - 3));
    }
    return { major: major.detach(), minor: minor.detach() };
  }, []);

  return (
    <View
      accessible
      accessibilityLabel={`Heading ${wrapped} degrees ${cardinal(heading)}${note ? `, ${note}` : ''}`}
      style={[styles.card, style]}
    >
      <View style={styles.window} pointerEvents="none">
        <Animated.View style={[styles.dial, dial]}>
          <Canvas style={styles.canvas}>
            <Circle cx={R} cy={R} r={R - 1}>
              <RadialGradient
                c={vec(R, R)}
                r={R}
                colors={[BEZEL_IN, BEZEL_IN, BEZEL_OUT]}
                positions={[0, 0.66, 1]}
              />
            </Circle>
            <Path path={ticks.minor} style="stroke" strokeWidth={1} color={TICK_MINOR} />
            <Path path={ticks.major} style="stroke" strokeWidth={1.5} color={colors.highlight} />
          </Canvas>
          {LABELS.map(({ at, text, strong }) => (
            <View
              key={text}
              style={[
                styles.label,
                { transform: [{ rotate: `${at}deg` }, { translateY: -LABEL_R }] },
              ]}
            >
              <Text
                style={{
                  color: strong ? colors.highlight : MUTED,
                  fontSize: strong ? font.size.sm : font.size.xs - 1,
                  fontWeight: strong ? font.weight.bold : font.weight.medium,
                }}
              >
                {text}
              </Text>
            </View>
          ))}
        </Animated.View>
        <View style={styles.pointer} />
      </View>

      <View style={styles.readout} pointerEvents="none">
        {note ? <Text style={{ color: MUTED, fontSize: font.size.xs }}>{note}</Text> : null}
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.xl,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {wrapped}°<Text style={{ color: RED, fontSize: font.size.md }}> {cardinal(heading)}</Text>
        </Text>
      </View>
    </View>
  );
}

const MUTED = 'hsl(0, 0%, 66%)';
const RED = 'hsl(6, 88%, 58%)';
const TICK_MINOR = 'hsla(0, 0%, 100%, 0.34)';
const BEZEL_IN = 'hsl(0, 0%, 6%)';
const BEZEL_OUT = 'hsl(0, 0%, 22%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    height: WINDOW_H + 8,
    alignSelf: 'center',
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
  },
  window: { width: SIZE, height: WINDOW_H + 8, alignItems: 'center' },
  dial: { position: 'absolute', top: 14, width: SIZE, height: SIZE },
  canvas: { width: SIZE, height: SIZE },
  label: {
    position: 'absolute',
    top: R - 9,
    left: R - 18,
    width: 36,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    top: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: RED,
  },
  readout: { position: 'absolute', bottom: 8, alignItems: 'center' },
});
