import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type Person = {
  id: string;
  name: string;
  /** A photo URL. Without one, the initials are shown. */
  image?: string;
};

export type AvatarStackProps = {
  people: readonly Person[];
  /** Faces shown while stacked; the rest are counted in a "+n" chip. Defaults to 4. */
  max?: number;
  /** Faces shown once spread out. Defaults to 6. */
  maxOpen?: number;
  /** Avatar diameter. Defaults to 40. */
  size?: number;
  /** The colour around each avatar. Defaults to the theme background. */
  ringColor?: string;
  /** A light tap when it opens or closes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const OVERLAP = 0.62;
const GAP = 10;

/** One or two initials from a name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Overlapping avatars for a team or a set of people. Tap the stack and the
 * faces fan out one after another with their first names beneath; tap again
 * and they tuck back in behind the first.
 */
export function AvatarStack({
  people,
  max = 4,
  maxOpen = 6,
  size = 40,
  ringColor,
  haptics = true,
  testID,
  style,
}: AvatarStackProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [open, setOpen] = useState(false);
  const p = useSharedValue(0);

  useEffect(() => {
    p.set(withSpring(open ? 1 : 0, spring('smooth', reduced)));
  }, [open, reduced, p]);

  const shownClosed = Math.min(people.length, max);
  // Spread out, it never grows wider than the space it has, chip included.
  const [room, setRoom] = useState(Infinity);
  const fits = Math.floor((room + GAP) / (size + GAP));
  const wanted = Math.min(people.length, Math.max(max, maxOpen));
  const shownOpen = Math.max(
    shownClosed,
    wanted < people.length || wanted > fits ? Math.min(wanted, fits - 1) : wanted,
  );
  const extraClosed = people.length - shownClosed;
  const extraOpen = people.length - shownOpen;
  const visible = people.slice(0, shownOpen);
  const step = size * OVERLAP;
  const closedW = (shownClosed - 1) * step + size + (extraClosed > 0 ? step : 0);
  const openW = (shownOpen - 1) * (size + GAP) + size + (extraOpen > 0 ? size + GAP : 0);

  const box = useAnimatedStyle(() => ({
    width: closedW + (openW - closedW) * p.get(),
    height: size + p.get() * 22,
  }));

  const names = people.map((x) => x.name);
  const label = `${people.length} people: ${names.slice(0, 6).join(', ')}${people.length > 6 ? ` and ${people.length - 6} more` : ''}`;

  return (
    <View style={style} onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      <Pressable
        testID={testID}
        onPress={() => {
          haptic('tap');
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? 'Stacks the faces' : 'Spreads the faces out'}
        style={styles.hit}
      >
        <Animated.View style={box}>
          {visible.map((person, i) => (
            <Face
              key={person.id}
              person={person}
              index={i}
              size={size}
              p={p}
              stackedOut={i >= shownClosed}
              ring={ringColor ?? colors.background}
            />
          ))}
          {extraClosed > 0 || extraOpen > 0 ? (
            <More
              closed={extraClosed}
              open={extraOpen}
              closedX={shownClosed * step}
              openX={shownOpen * (size + GAP)}
              size={size}
              p={p}
              ring={ringColor ?? colors.background}
            />
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

type FaceProps = {
  person: Person;
  index: number;
  size: number;
  p: SharedValue<number>;
  stackedOut: boolean;
  ring: string;
};

function Face({ person, index, size, p, stackedOut, ring }: FaceProps) {
  const { colors, font } = useKinetikTheme();
  // Each face follows the stack's progress a beat after the one before it.
  const lag = Math.min(0.4, index * 0.06);
  const motion = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (p.get() - lag) / (1 - lag)));
    const closed = index * size * OVERLAP;
    const opened = index * (size + GAP);
    return {
      opacity: stackedOut ? t : 1,
      zIndex: 100 - index,
      transform: [
        { translateX: closed + (opened - closed) * t },
        { scale: stackedOut ? 0.7 + t * 0.3 : 1 },
      ],
    };
  });
  const name = useAnimatedStyle(() => ({
    opacity: Math.max(0, p.get() * 1.6 - 0.6),
    transform: [{ translateY: (1 - p.get()) * -4 }],
  }));
  const palette = [
    { bg: colors.azureSoft, fg: colors.azure },
    { bg: colors.emberSoft, fg: colors.text },
    { bg: colors.surfaceRaised, fg: colors.textMuted },
  ];
  const tone = palette[index % palette.length]!;

  return (
    <Animated.View style={[styles.face, { width: size }, motion]} pointerEvents="none">
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ring,
            // Opaque underneath, so overlapping faces never show through each other.
            backgroundColor: ring,
          },
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tone.bg }]} />
        {person.image ? (
          <Image
            source={{ uri: person.image }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={{ color: tone.fg, fontSize: size * 0.36, fontWeight: font.weight.semibold }}>
            {initials(person.name)}
          </Text>
        )}
      </View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.name,
          { width: size + GAP, color: colors.textMuted, fontSize: font.size.xs },
          name,
        ]}
      >
        {person.name.split(' ')[0]}
      </Animated.Text>
    </Animated.View>
  );
}

type MoreProps = {
  closed: number;
  open: number;
  closedX: number;
  openX: number;
  size: number;
  p: SharedValue<number>;
  ring: string;
};

function More({ closed, open, closedX, openX, size, p, ring }: MoreProps) {
  const { colors, font } = useKinetikTheme();
  const motion = useAnimatedStyle(() => {
    const t = p.get();
    const count = t > 0.5 ? open : closed;
    return {
      opacity: count > 0 ? 1 : Math.max(0, 1 - t * 2),
      transform: [{ translateX: closedX + (openX - closedX) * t }],
    };
  });
  const closedText = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - p.get() * 2) }));
  const openText = useAnimatedStyle(() => ({ opacity: Math.max(0, p.get() * 2 - 1) }));
  return (
    <Animated.View style={[styles.face, { width: size }, motion]} pointerEvents="none">
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ring,
            backgroundColor: colors.surfaceRaised,
          },
        ]}
      >
        {[
          { n: closed, style: closedText },
          { n: open, style: openText },
        ].map(({ n, style }, i) =>
          n > 0 ? (
            <Animated.Text
              key={i}
              style={[
                styles.count,
                {
                  color: colors.textMuted,
                  fontSize: size * 0.32,
                  fontWeight: font.weight.semibold,
                },
                style,
              ]}
            >
              +{n}
            </Animated.Text>
          ) : null,
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 2 },
  face: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },
  circle: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { textAlign: 'center', marginTop: 4 },
  count: { position: 'absolute' },
});
