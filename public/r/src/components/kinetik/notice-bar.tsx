import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
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
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type Notice = {
  text: string;
  /** A link after the text, e.g. "See what's new". */
  action?: { label: string; onPress: () => void };
};

export type NoticeBarProps = {
  /** One or more messages; several take turns. */
  messages: readonly Notice[];
  /** Time each message stays, in ms. Defaults to 4500. */
  interval?: number;
  /** `azure` for news and offers, `neutral` for quieter notes. Defaults to `azure`. */
  tone?: 'azure' | 'neutral';
  /** Shown before the text, e.g. a small icon. */
  leading?: ReactNode;
  /** Shows a close button. Called once the bar has folded away. */
  onDismiss?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A slim announcement bar. Several messages take turns, each rolling up and
 * out as the next rises in; holding the bar pauses it. Closing it folds the
 * bar shut so the content below slides up into its place.
 */
export function NoticeBar({
  messages,
  interval = 4500,
  tone = 'azure',
  leading,
  onDismiss,
  testID,
  style,
}: NoticeBarProps) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [height, setHeight] = useState(0);
  const [gone, setGone] = useState(false);
  const t = useSharedValue(1);
  const fold = useSharedValue(1);

  const ink = tone === 'azure' ? colors.onAzure : colors.text;
  const ground = tone === 'azure' ? colors.azure : colors.surfaceRaised;
  const count = messages.length;

  // Messages that move by themselves are hard to follow with a screen reader, so they wait.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => live && setScreenReader(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const paused = held || screenReader || count < 2;
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => {
      setPrev(index);
      setIndex((index + 1) % count);
    }, interval);
    return () => clearTimeout(id);
  }, [paused, index, count, interval]);

  useEffect(() => {
    if (prev === null) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [prev, index, reduced, t]);

  const dismiss = () => {
    const done = () => {
      setGone(true);
      onDismiss?.();
    };
    if (reduced) return done();
    fold.set(
      withTiming(0, { duration: durations.base, easing: easings.standard }, (finished) => {
        if (finished) scheduleOnRN(done);
      }),
    );
  };

  const shell = useAnimatedStyle(() => ({
    height: height > 0 && fold.get() < 1 ? height * fold.get() : undefined,
    opacity: fold.get(),
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [{ translateY: -t.get() * 14 }],
  }));
  const incoming = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * 14 }],
  }));

  if (gone || count === 0) return null;
  const current = messages[index % count]!;
  const old = prev !== null && prev !== index ? messages[prev % count] : undefined;

  const line = (notice: Notice, interactive: boolean) => (
    <View style={styles.line}>
      <Text numberOfLines={1} style={[styles.text, { color: ink, fontSize: font.size.sm }]}>
        {notice.text}
      </Text>
      {notice.action ? (
        <Pressable
          disabled={!interactive}
          onPress={notice.action.onPress}
          accessibilityRole="link"
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Text
            style={{
              color: ink,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
              textDecorationLine: 'underline',
            }}
          >
            {notice.action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      testID={testID}
      onLayout={(e) => {
        if (fold.get() === 1) setHeight(e.nativeEvent.layout.height);
      }}
      style={[styles.shell, { backgroundColor: ground }, shell, style]}
    >
      <Pressable
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        accessible={false}
        style={[styles.bar, { paddingLeft: space[4], gap: space[2] }]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.window}>
          {old ? (
            <Animated.View
              key={`o${prev}-${index}`}
              style={[StyleSheet.absoluteFill, styles.center, outgoing]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {line(old, false)}
            </Animated.View>
          ) : null}
          <Animated.View
            key={`i${index}`}
            style={[StyleSheet.absoluteFill, styles.center, incoming]}
          >
            {line(current, true)}
          </Animated.View>
        </View>
        {onDismiss ? (
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.close}
          >
            <View style={[styles.cross, { backgroundColor: ink }]} />
            <View style={[styles.cross, styles.crossTurn, { backgroundColor: ink }]} />
          </Pressable>
        ) : (
          <View style={{ width: space[4] }} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden' },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  leading: { alignItems: 'center', justifyContent: 'center' },
  window: { flex: 1, height: minTouchTarget, overflow: 'hidden' },
  center: { justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flexShrink: 1 },
  close: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    position: 'absolute',
    width: 14,
    height: 1.75,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  crossTurn: { transform: [{ rotate: '-45deg' }] },
});
