import {
  Canvas,
  Fill,
  Group,
  Path,
  RadialGradient,
  Rect,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { easings, spring } from '../../lib/kinetik/motion/motion';
import { runtimeEffect } from '../../lib/kinetik/shaders/sksl';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { EMBLEM_COLOR, PLANE_H, PLANE_PARTS, PLANE_W, TAIL_COLOR } from './arrival-card.plane';
import { FAR_CLOUDS, NEAR_CLOUDS, WISPS } from './arrival-card.shader';

export type ArrivalCardProps = {
  /** Big code in the corner, e.g. "NRT". */
  code: string;
  /** Place under the code, e.g. "TOKYO". */
  city: string;
  /** Arrival time as shown, e.g. "3:25PM". */
  time: string;
  /** Status beside the time, e.g. "ON SCHEDULE". */
  status?: string;
  /** Chip in the corner, e.g. the flight number. */
  tag?: string;
  /** Label above the time. Defaults to "LANDS AT:". */
  arriveLabel?: string;
  /** Colour of the plane's tail and tailplane. Defaults to a bright blue. */
  tailColor?: string;
  /** Colour of the disc tinting the tail. Defaults to a deep blue. */
  emblemColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Seconds each cloud layer takes to slide by one period. Nearer layers pass faster. */
const FAR_SECONDS = 30;
const NEAR_SECONDS = 10;
const WISP_SECONDS = 3.2;

const PLANE = PLANE_PARTS.map((part) => ({
  ...part,
  path: Skia.Path.MakeFromSVGString(part.d)!,
}));

/**
 * A square arrival widget: an airliner cruising through a night-time cloud deck
 * that scrolls past it, with the destination above and the landing time below.
 * The plane is drawn, not a photo, and carries no airline's marks.
 */
export function ArrivalCard({
  code,
  city,
  time,
  status,
  tag,
  arriveLabel = 'LANDS AT:',
  tailColor = TAIL_COLOR,
  emblemColor = EMBLEM_COLOR,
  style,
}: ArrivalCardProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const enter = useSharedValue(reduced ? 1 : 0);
  const sway = useSharedValue(0.5);

  useEffect(() => {
    if (reduced) {
      enter.set(1);
      sway.set(0.5);
      return;
    }
    enter.set(withSpring(1, spring('smooth')));
    sway.set(withRepeat(withTiming(1, { duration: 4600, easing: easings.inOut }), -1, true));
  }, [reduced, enter, sway]);

  const planeWidth = width * 0.9;
  const scale = planeWidth / PLANE_W;
  const plane = useAnimatedStyle(() => ({
    transform: [
      { translateX: (enter.get() - 1) * width },
      { translateY: (sway.get() - 0.5) * 5 },
      { rotate: `${(sway.get() - 0.5) * 0.9}deg` },
    ],
  }));

  const small = {
    color: MUTED,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
  } as const;

  return (
    <View
      accessible
      accessibilityLabel={[tag, `${code}, ${city}`, `${arriveLabel} ${time}`, status]
        .filter(Boolean)
        .join('. ')}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      style={[styles.card, gradient(SKY), { padding: space[4] }, style]}
    >
      {width > 0 ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="arrival-plane">
          <CloudLayer source={FAR_CLOUDS} width={width} height={height} seconds={FAR_SECONDS} />
          <CloudLayer source={NEAR_CLOUDS} width={width} height={height} seconds={NEAR_SECONDS} />
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={width} height={height}>
              <RadialGradient
                c={vec(width / 2, height * 0.52)}
                r={width * 0.72}
                colors={[VIGNETTE_CLEAR, VIGNETTE_MID, VIGNETTE_DARK]}
                positions={[0.2, 0.62, 1]}
              />
            </Rect>
          </Canvas>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, plane]}>
            <Canvas style={{ width: planeWidth, height: PLANE_H * scale }}>
              <Group transform={[{ scale }]}>
                <Airliner tail={tailColor} emblem={emblemColor} />
              </Group>
            </Canvas>
          </Animated.View>
          <CloudLayer source={WISPS} width={width} height={height} seconds={WISP_SECONDS} />
        </View>
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
          <Text
            numberOfLines={1}
            style={{
              color: colors.highlight,
              fontSize: font.size['3xl'],
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.tight,
            }}
          >
            {code}
          </Text>
          <Text numberOfLines={1} style={small}>
            {city}
          </Text>
        </View>
      </View>

      <View>
        <Text numberOfLines={1} style={small}>
          {arriveLabel}
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.md,
              fontWeight: font.weight.bold,
            }}
          >
            {time}
          </Text>
          {status ? (
            <Text
              style={{ color: GREEN, fontSize: font.size.xs + 1, fontWeight: font.weight.bold }}
            >
              {'  '}
              {status}
            </Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

/**
 * One layer of clouds: drawn once, then slid to the left as a view on the UI
 * thread. The noise repeats every card width, and the canvas holds two of them,
 * so it can start over after sliding by one without a seam.
 */
function CloudLayer({
  source,
  width,
  height,
  seconds,
}: {
  source: string;
  width: number;
  height: number;
  seconds: number;
}) {
  const reduced = useReduceMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(
      reduced
        ? 0
        : withRepeat(
            withTiming(width, { duration: seconds * 1000, easing: easings.linear }),
            -1,
            false,
          ),
    );
  }, [reduced, width, seconds, x]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: -x.get() }] }));

  return (
    <Animated.View style={[styles.layer, { width: width * 2, height }, slide]}>
      <Canvas style={{ width: width * 2, height }}>
        <Fill>
          <Shader
            source={runtimeEffect(source)}
            uniforms={{ res: [width * 2, height], period: width }}
          />
        </Fill>
      </Canvas>
    </Animated.View>
  );
}

/** The airliner, painted back to front. */
function Airliner({ tail, emblem }: { tail: string; emblem: string }) {
  return (
    <>
      {PLANE.map(({ path, fill, tone, opacity, at }, i) => {
        const color = tone === 'tail' ? tail : tone === 'emblem' ? emblem : (fill ?? tail);
        const shape = <Path key={i} path={path} color={color} opacity={opacity ?? 1} />;
        return at ? (
          <Group
            key={i}
            transform={[{ translateX: at[1] }, { translateY: at[2] }, { scale: at[0] }]}
          >
            {shape}
          </Group>
        ) : (
          shape
        );
      })}
    </>
  );
}

const VIGNETTE_CLEAR = 'hsla(220, 30%, 5%, 0)';
const VIGNETTE_MID = 'hsla(220, 30%, 5%, 0.32)';
const VIGNETTE_DARK = 'hsla(220, 30%, 5%, 0.82)';
const MUTED = 'hsl(214, 10%, 68%)';
const GREEN = 'hsl(145, 76%, 48%)';
const SKY =
  'linear-gradient(180deg, hsl(220, 12%, 9%) 0%, hsl(218, 18%, 13%) 55%, hsl(220, 12%, 8%) 100%)';

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
  layer: { position: 'absolute', top: 0, left: 0 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  end: { alignItems: 'flex-end', flexShrink: 1 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'hsl(214, 16%, 22%)',
  },
});
