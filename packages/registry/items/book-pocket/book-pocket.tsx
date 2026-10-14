import { BlurTargetView, BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type PocketBook = {
  id: string;
  title: string;
  author?: string;
  /** A cover image. Without one, a typographic cover is drawn from `tones`. */
  cover?: ImageSourcePropType;
  /** Two colours for a drawn cover's gradient. */
  tones?: readonly [string, string];
};

export type BookPocketProps = {
  /** Shelf name under the pocket, e.g. "Fantasy". */
  title: string;
  /** Up to four books, back to front. */
  books: readonly PocketBook[];
  /** Number shown after the title. Defaults to the number of books. */
  count?: number;
  /** Word after the count. Defaults to "books". */
  unit?: string;
  onPress?: () => void;
  /** A tick as the covers lift. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Cover poses as shares of the width: centre x, centre y and turn, at rest and lifted. */
const POSES = [
  { x: 0.36, y: 0.42, turn: -7, lx: 0.3, ly: 0.2, lturn: -13 },
  { x: 0.56, y: 0.36, turn: 4, lx: 0.58, ly: 0.12, lturn: 6 },
  { x: 0.66, y: 0.44, turn: 9, lx: 0.72, ly: 0.24, lturn: 15 },
  { x: 0.46, y: 0.46, turn: -2, lx: 0.44, ly: 0.26, lturn: -4 },
] as const;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

const TONES: readonly (readonly [string, string])[] = [
  ['hsl(158, 38%, 26%)', 'hsl(170, 30%, 12%)'],
  ['hsl(8, 62%, 44%)', 'hsl(350, 50%, 18%)'],
  ['hsl(222, 40%, 30%)', 'hsl(230, 40%, 12%)'],
  ['hsl(38, 70%, 52%)', 'hsl(20, 60%, 26%)'],
];

/**
 * A shelf of books tucked into a frosted acrylic pocket held by four pins.
 * The covers drop in one by one when it appears; press it (or hover on the
 * web) and they rise out of the pocket and fan apart, then slide back.
 */
export function BookPocket({
  title,
  books,
  count,
  unit = 'books',
  onPress,
  haptics = true,
  style,
}: BookPocketProps) {
  const { colors, font, radius, scheme } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const target = useRef<View>(null);
  const [width, setWidth] = useState(0);
  const [up, setUp] = useState(false);
  const lift = useSharedValue(0);
  const shelf = books.slice(0, 4);
  const total = count ?? books.length;

  useEffect(() => {
    lift.set(reduced ? (up ? 1 : 0) : withSpring(up ? 1 : 0, spring(up ? 'bouncy' : 'smooth')));
  }, [up, reduced, lift]);

  const raise = (next: boolean) => {
    if (next && !up) haptic('tick');
    setUp(next);
  };

  const height = width * 0.98;
  const pocketTop = height * 0.5;

  return (
    <View style={style}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${title}, ${total} ${unit}`}
        onPress={onPress}
        onPressIn={() => raise(true)}
        onPressOut={() => raise(false)}
        onHoverIn={() => raise(true)}
        onHoverOut={() => raise(false)}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.stage, { height: height || 180 }]}
      >
        {width > 0 ? (
          <>
            <BlurTargetView ref={target} style={StyleSheet.absoluteFill} pointerEvents="none">
              {shelf.map((book, i) => (
                <Cover
                  key={book.id}
                  book={book}
                  index={i}
                  width={width}
                  lift={lift}
                  tones={book.tones ?? TONES[i % TONES.length]!}
                />
              ))}
            </BlurTargetView>
            <View
              pointerEvents="none"
              style={[
                styles.pocket,
                {
                  top: pocketTop,
                  borderRadius: radius.xs,
                  borderColor: withAlpha(colors.highlight, scheme === 'dark' ? 0.16 : 0.7),
                },
              ]}
            >
              <BlurView
                style={StyleSheet.absoluteFill}
                blurTarget={target}
                blurMethod="dimezisBlurViewSdk31Plus"
                intensity={28}
                tint={scheme === 'dark' ? 'dark' : 'light'}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  gradient(
                    `linear-gradient(180deg, ${withAlpha(colors.highlight, scheme === 'dark' ? 0.1 : 0.4)} 0%, ${withAlpha(colors.surface, 0.18)} 100%)`,
                  ),
                ]}
              />
              {(['tl', 'tr', 'bl', 'br'] as const).map((at) => (
                <View
                  key={at}
                  style={[
                    styles.pin,
                    at[0] === 't' ? { top: 7 } : { bottom: 7 },
                    at[1] === 'l' ? { left: 7 } : { right: 7 },
                    {
                      backgroundColor: withAlpha(colors.highlight, 0.75),
                      borderColor: withAlpha(colors.text, 0.25),
                    },
                  ]}
                />
              ))}
            </View>
          </>
        ) : null}
      </Pressable>
      <Text
        style={{
          color: colors.text,
          fontSize: font.size.sm + 1,
          fontWeight: font.weight.medium,
          textAlign: 'center',
          marginTop: 10,
        }}
      >
        {title}
        <Text style={{ color: colors.textSubtle, fontWeight: font.weight.regular }}>
          {'  ·  '}
          {total} {unit}
        </Text>
      </Text>
    </View>
  );
}

/** One cover: drops into the pocket on arrival and rises out with the lift. */
function Cover({
  book,
  index,
  width,
  lift,
  tones,
}: {
  book: PocketBook;
  index: number;
  width: number;
  lift: SharedValue<number>;
  tones: readonly [string, string];
}) {
  const { font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const drop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) drop.set(withDelay(120 + index * 120, withSpring(1, spring('smooth'))));
  }, [index, reduced, drop]);

  const pose = POSES[index]!;
  const w = width * 0.5;
  const h = w * 1.45;
  const style = useAnimatedStyle(() => {
    const o = lift.get();
    // Each cover rises a beat behind the one in front of it.
    const lag = Math.max(0, Math.min(1, o * 1.25 - index * 0.08));
    const x = (pose.x + (pose.lx - pose.x) * lag) * width - w / 2;
    const y = (pose.y + (pose.ly - pose.y) * lag) * width - h / 2 - (1 - drop.get()) * width * 0.5;
    return {
      opacity: Math.min(1, drop.get() * 2),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${pose.turn + (pose.lturn - pose.turn) * lag}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.cover, { width: w, height: h, boxShadow: shadow.md }, style]}>
      {book.cover ? (
        <Image source={book.cover} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.drawn,
            gradient(`linear-gradient(160deg, ${tones[0]} 0%, ${tones[1]} 100%)`),
          ]}
        >
          <View style={[styles.frame, { borderColor: 'hsla(40, 60%, 92%, 0.3)' }]} />
          <Text
            numberOfLines={3}
            style={{
              color: 'hsl(40, 60%, 92%)',
              fontFamily: SERIF,
              fontSize: w * 0.15,
              lineHeight: w * 0.17,
              fontWeight: font.weight.bold,
              textAlign: 'center',
            }}
          >
            {book.title}
          </Text>
          {book.author ? (
            <Text
              numberOfLines={1}
              style={{
                color: 'hsl(40, 40%, 80%)',
                fontSize: Math.max(8, w * 0.07),
                letterSpacing: 1.2,
                textAlign: 'center',
                marginTop: w * 0.08,
              }}
            >
              {book.author.toUpperCase()}
            </Text>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%' },
  pocket: {
    position: 'absolute',
    left: '3%',
    right: '3%',
    bottom: 0,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pin: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, borderWidth: 1 },
  cover: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 3,
    overflow: 'hidden',
  },
  drawn: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  frame: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1 },
});
