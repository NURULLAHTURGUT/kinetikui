import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ChatMessage = {
  id: string;
  from: 'me' | 'them';
  text: string;
  /** Shown under the last message of a group, e.g. "09:41". */
  time?: string;
};

export type ChatThreadProps = {
  messages: readonly ChatMessage[];
  /** Shows three bouncing dots from the other side. */
  typing?: boolean;
  /** Shows "Seen" under your last message. */
  seen?: boolean;
  /** The other person's name, for screen readers. Defaults to "Them". */
  name?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const BIG = 18;
const SMALL = 5;

/**
 * A conversation of grouped bubbles. Messages from one sender in a row share
 * a group with tucked corners, a new message rises in from its side, the
 * other person's typing shows as three dots in a wave, and "Seen" fades in
 * under your last message.
 */
export function ChatThread({
  messages,
  typing = false,
  seen = false,
  name = 'Them',
  testID,
  style,
}: ChatThreadProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  // Messages already there when the thread mounts appear without animating.
  const [initial] = useState(() => new Set(messages.map((m) => m.id)));
  const lastMine = [...messages].reverse().find((m) => m.from === 'me')?.id;

  return (
    <View testID={testID} style={[styles.root, style]} accessibilityLiveRegion="polite">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const first = prev?.from !== m.from;
        const last = next?.from !== m.from;
        return (
          <View key={m.id} style={{ marginTop: i === 0 ? 0 : first ? 12 : 2 }}>
            <Bubble
              message={m}
              first={first}
              last={last}
              name={name}
              enter={!initial.has(m.id) && !reduced}
            />
            {last && m.time ? (
              <Text
                style={[
                  styles.meta,
                  m.from === 'me' ? styles.right : styles.left,
                  { color: colors.textSubtle, fontSize: font.size.xs },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {m.time}
              </Text>
            ) : null}
            {seen && m.id === lastMine ? <Seen /> : null}
          </View>
        );
      })}
      {typing ? <Typing name={name} reduced={reduced} /> : null}
    </View>
  );
}

type BubbleProps = {
  message: ChatMessage;
  first: boolean;
  last: boolean;
  name: string;
  enter: boolean;
};

function Bubble({ message, first, last, name, enter }: BubbleProps) {
  const { colors, font } = useKinetikTheme();
  const mine = message.from === 'me';
  const p = useSharedValue(enter ? 0 : 1);
  useEffect(() => {
    p.set(withSpring(1, spring('smooth')));
  }, [p]);
  const motion = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get() * 1.5),
    transform: [{ translateY: (1 - p.get()) * 18 }, { scale: 0.92 + p.get() * 0.08 }],
  }));

  // The side facing the sender is tucked in the middle of a group and tails off at its end.
  const top = first ? BIG : SMALL;
  const bottom = last ? BIG - 12 : SMALL;
  const corners = mine
    ? { borderRadius: BIG, borderTopRightRadius: top, borderBottomRightRadius: bottom }
    : { borderRadius: BIG, borderTopLeftRadius: top, borderBottomLeftRadius: bottom };

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${mine ? 'You' : name}: ${message.text}${message.time ? `, ${message.time}` : ''}`}
      style={[
        styles.bubble,
        mine ? styles.mine : styles.theirs,
        corners,
        { backgroundColor: mine ? colors.azure : colors.surfaceRaised },
        { transformOrigin: mine ? '100% 100%' : '0% 100%' },
        motion,
      ]}
    >
      <Text
        style={{
          color: mine ? colors.onAzure : colors.text,
          fontSize: font.size.md,
          lineHeight: 21,
        }}
      >
        {message.text}
      </Text>
    </Animated.View>
  );
}

function Seen() {
  const { colors, font } = useKinetikTheme();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(
      withDelay(200, withTiming(1, { duration: durations.slow, easing: easings.standard })),
    );
  }, [shown]);
  const motion = useAnimatedStyle(() => ({ opacity: shown.get() }));
  return (
    <Animated.Text
      style={[
        styles.meta,
        styles.right,
        { color: colors.textSubtle, fontSize: font.size.xs },
        motion,
      ]}
    >
      Seen
    </Animated.Text>
  );
}

function Typing({ name, reduced }: { name: string; reduced: boolean }) {
  const { colors } = useKinetikTheme();
  const wave = useSharedValue(0);
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    p.set(withSpring(1, spring('smooth', reduced)));
    if (reduced) return;
    wave.set(withRepeat(withTiming(1, { duration: 1100, easing: easings.linear }), -1));
    return () => cancelAnimation(wave);
  }, [reduced, p, wave]);
  const motion = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ scale: 0.8 + p.get() * 0.2 }],
  }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${name} is typing`}
      style={[
        styles.bubble,
        styles.theirs,
        styles.typing,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: BIG,
          borderBottomLeftRadius: BIG - 12,
          marginTop: 12,
        },
        { transformOrigin: '0% 100%' },
        motion,
      ]}
    >
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} wave={wave} />
      ))}
    </Animated.View>
  );
}

function Dot({ index, wave }: { index: number; wave: SharedValue<number> }) {
  const { colors } = useKinetikTheme();
  const motion = useAnimatedStyle(() => {
    // Each dot rises in turn: a short bump travelling along the row.
    const t = (wave.get() - index * 0.16 + 1) % 1;
    const up = t < 0.32 ? Math.sin((t / 0.32) * Math.PI) : 0;
    return { opacity: 0.45 + up * 0.55, transform: [{ translateY: -up * 4 }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: colors.textMuted }, motion]} />;
}

const styles = StyleSheet.create({
  root: { gap: 0 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9 },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  meta: { marginTop: 4, marginHorizontal: 6 },
  right: { alignSelf: 'flex-end' },
  left: { alignSelf: 'flex-start' },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
