import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, spring, timing } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type Story = {
  key: string;
  image: ImageSourcePropType;
  title?: string;
  caption?: string;
  /** Describes the picture. Defaults to the title. */
  accessibilityLabel?: string;
};

export type StoryCardProps = {
  stories: readonly Story[];
  /** How long each story shows, in ms. Defaults to 5000. */
  duration?: number;
  /** Story to start on. Defaults to 0. */
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Called after the last story when `loop` is off. */
  onEnd?: () => void;
  /** Start again after the last story. Defaults to true. */
  loop?: boolean;
  /** Hold every story still, e.g. while the card is off screen. */
  paused?: boolean;
  /** Height divided by width. Defaults to 1.5. */
  aspect?: number;
  /** Laid over the top of the card, under the progress bars: a source, a time. */
  header?: ReactNode;
  /** A tick when stepping by hand. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-bleed stories with a progress bar for each one. Tap the right side for
 * the next, the left for the previous, and hold anywhere to pause. Each
 * picture drifts slowly closer while it shows, and the next fades in over it.
 */
export function StoryCard({
  stories,
  duration = 5000,
  initialIndex = 0,
  onIndexChange,
  onEnd,
  loop = true,
  paused = false,
  aspect = 1.5,
  header,
  haptics = true,
  testID,
  style,
}: StoryCardProps) {
  const { colors, font, radius, space, scheme } = useKinetikTheme();
  // Scrims are dark in both schemes: the text over them is always light, on a photo.
  const ink = scheme === 'dark' ? colors.background : colors.text;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const screenReader = useScreenReader();
  const n = stories.length;

  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(() => Math.max(0, Math.min(n - 1, initialIndex)));
  const [holding, setHolding] = useState(false);
  const [ended, setEnded] = useState(false);
  // Bumped whenever a bar restarts, so restarting the same story runs it again.
  const [round, setRound] = useState(0);
  // Auto-advance stops for screen readers: content must not move on before it is read.
  const running = !paused && !holding && !ended && !screenReader && n > 0;

  const progress = useSharedValue(0);
  const press = useSharedValue(0);

  const go = (next: number, byHand: boolean) => {
    if (next < 0) {
      // Before the first story: start it over.
      progress.set(0);
      setEnded(false);
      setRound((r) => r + 1);
      return;
    }
    if (next >= n) {
      if (!loop) {
        setEnded(true);
        onEnd?.();
        return;
      }
      next = 0;
    }
    if (byHand) haptic('tick');
    progress.set(0);
    setEnded(false);
    setRound((r) => r + 1);
    setIndex(next);
    onIndexChange?.(next);
  };

  // Runs the current story's bar from wherever it stands, and moves on when it fills.
  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      return;
    }
    const advance = () => go(index + 1, false);
    const left = (1 - progress.get()) * duration;
    progress.set(
      withTiming(1, { duration: left, easing: Easing.linear }, (done) => {
        'worklet';
        if (done) scheduleOnRN(advance);
      }),
    );
    // `go` reads the latest props on each render; the bar restarts only when these change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index, round, duration, progress]);

  const onPress = (e: GestureResponderEvent) => {
    const { locationX } = e.nativeEvent;
    // The left third goes back; the rest goes forward, as people expect from stories.
    go(locationX < width / 3 ? index - 1 : index + 1, true);
  };

  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.015 }] }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') go(index + 1, true);
    else if (e.nativeEvent.actionName === 'decrement') go(index - 1, true);
  };

  const story = stories[index];

  return (
    <Animated.View
      testID={testID}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.card,
        { borderRadius: radius.xl, backgroundColor: colors.surfaceSunken },
        width > 0 && { height: width * aspect },
        style,
        shell,
      ]}
    >
      {stories.map((s, i) => (
        <Layer key={s.key} story={s} active={i === index} progress={progress} still={reduced} />
      ))}

      <Pressable
        onPress={onPress}
        onLongPress={() => {}}
        delayLongPress={220}
        onPressIn={() => {
          setHolding(true);
          press.set(withSpring(1, spring('snappy', reduced)));
        }}
        onPressOut={() => {
          setHolding(false);
          press.set(withSpring(0, spring('smooth', reduced)));
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={story?.accessibilityLabel ?? story?.title ?? 'Story'}
        accessibilityValue={{ text: `Story ${index + 1} of ${n}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[StyleSheet.absoluteFill, styles.touch]}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.top,
          { padding: space[3], gap: space[3] },
          gradient(`linear-gradient(180deg, ${withAlpha(ink, 0.5)} 0%, ${withAlpha(ink, 0)} 100%)`),
        ]}
      >
        <View style={styles.bars}>
          {stories.map((s, i) => (
            <Bar
              key={s.key}
              state={i < index ? 'done' : i > index ? 'next' : 'now'}
              progress={progress}
            />
          ))}
        </View>
        {header}
      </View>

      {story?.title || story?.caption ? (
        <View
          pointerEvents="none"
          style={[
            styles.bottom,
            { padding: space[5], paddingTop: space[12] },
            gradient(
              `linear-gradient(180deg, ${withAlpha(ink, 0)} 0%, ${withAlpha(ink, 0.78)} 100%)`,
            ),
          ]}
        >
          <Caption key={story.key} still={reduced}>
            {story.title ? (
              <Text
                style={{
                  color: colors.highlight,
                  fontSize: font.size['2xl'],
                  fontWeight: font.weight.bold,
                  letterSpacing: -0.6,
                }}
              >
                {story.title}
              </Text>
            ) : null}
            {story.caption ? (
              <Text style={{ color: withAlpha(colors.highlight, 0.78), fontSize: font.size.sm }}>
                {story.caption}
              </Text>
            ) : null}
          </Caption>
        </View>
      ) : null}
    </Animated.View>
  );
}

/**
 * True while a screen reader is running. The web cannot tell (react-native-web
 * always answers yes), so there it is always false.
 */
function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => alive && setOn(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

/** One picture: it fades in over the last and drifts closer while its bar fills. */
function Layer({
  story,
  active,
  progress,
  still,
}: {
  story: Story;
  active: boolean;
  progress: SharedValue<number>;
  still: boolean;
}) {
  const shown = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    if (active) shown.set(withTiming(1, timing('slow', still)));
    // The outgoing picture stays under the incoming one until it has fully arrived.
    else shown.set(withDelay(still ? 0 : durations.slow, withTiming(0, { duration: 0 })));
  }, [active, still, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    // The drift belongs to the picture showing; one that has left keeps its last framing.
    transform: [{ scale: still ? 1 : 1.02 + (active ? progress.get() : 1) * 0.06 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      // The incoming picture sits on top.
      style={[StyleSheet.absoluteFill, { zIndex: active ? 1 : 0 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={story.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </Animated.View>
  );
}

function Bar({
  state,
  progress,
}: {
  state: 'done' | 'now' | 'next';
  progress: SharedValue<number>;
}) {
  const { colors } = useKinetikTheme();
  const fill = useAnimatedStyle(() => ({
    width: `${(state === 'done' ? 1 : state === 'next' ? 0 : progress.get()) * 100}%`,
  }));
  return (
    <View style={[styles.bar, { backgroundColor: withAlpha(colors.highlight, 0.3) }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: colors.highlight }, fill]} />
    </View>
  );
}

/** The caption rises in with each new story. */
function Caption({ children, still }: { children: ReactNode; still: boolean }) {
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(1, spring('smooth', still)));
  }, [still, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * 14 }],
  }));
  return <Animated.View style={[{ gap: 4 }, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', width: '100%' },
  touch: { zIndex: 2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 2.5, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3 },
});
