import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type TimelineEvent = {
  key: string;
  title: string;
  /** When it happened, already formatted, e.g. "09:41" or "Yesterday". */
  time: string;
  description?: string;
  /** `current` rings the node in blue; `upcoming` leaves it hollow. Defaults to `done`. */
  state?: 'done' | 'current' | 'upcoming';
  /** Extra content under the description, e.g. a thumbnail or a button. */
  children?: ReactNode;
};

export type TimelineProps = {
  events: readonly TimelineEvent[];
  /** Replays the entrance when it changes. */
  playKey?: string | number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const RAIL = 24;
const NODE = 12;
/** Time between one event arriving and the next. */
const STEP = 140;

/**
 * Events in order along a rail. Each node pops in turn, the line draws down
 * from it to the next, and the event's text rises in beside it, so the eye
 * reads the story from the top.
 */
export function Timeline({ events, playKey, testID, style }: TimelineProps) {
  const reduced = useReduceMotion();
  return (
    <View testID={testID} style={style}>
      {events.map((event, i) => (
        <Row
          key={event.key}
          event={event}
          index={i}
          last={i === events.length - 1}
          reduced={reduced}
          playKey={playKey}
        />
      ))}
    </View>
  );
}

type RowProps = {
  event: TimelineEvent;
  index: number;
  last: boolean;
  reduced: boolean;
  playKey?: string | number;
};

function Row({ event, index, last, reduced, playKey }: RowProps) {
  const { colors, font, space } = useKinetikTheme();
  const state = event.state ?? 'done';
  const node = useSharedValue(reduced ? 1 : 0);
  const line = useSharedValue(reduced ? 1 : 0);
  const text = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      node.set(1);
      line.set(1);
      text.set(1);
      return;
    }
    node.set(0);
    line.set(0);
    text.set(0);
    const at = index * STEP;
    node.set(withDelay(at, withSpring(1, spring('bouncy'))));
    text.set(withDelay(at + 40, withSpring(1, spring('smooth'))));
    line.set(withDelay(at + 80, withTiming(1, { duration: STEP * 2, easing: easings.standard })));
  }, [index, reduced, playKey, node, line, text]);

  const dot = useAnimatedStyle(() => ({ transform: [{ scale: node.get() }] }));
  const ring = useAnimatedStyle(() => ({
    opacity: node.get() * 0.5,
    transform: [{ scale: 0.5 + node.get() * 0.5 }],
  }));
  const fill = useAnimatedStyle(() => ({ height: `${Math.max(0, line.get()) * 100}%` }));
  const body = useAnimatedStyle(() => ({
    opacity: Math.min(1, text.get()),
    transform: [{ translateX: (1 - text.get()) * 10 }],
  }));

  const nodeColor =
    state === 'current' ? colors.azure : state === 'upcoming' ? 'transparent' : colors.ember;
  const status = state === 'current' ? ', now' : state === 'upcoming' ? ', coming up' : '';

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.nodeBox}>
          {state === 'current' ? (
            <Animated.View style={[styles.ring, { backgroundColor: colors.azureSoft }, ring]} />
          ) : null}
          <Animated.View
            style={[
              styles.node,
              {
                backgroundColor: nodeColor,
                borderColor: state === 'upcoming' ? colors.borderStrong : nodeColor,
              },
              dot,
            ]}
          />
        </View>
        {!last ? (
          <View style={[styles.line, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.lineFill,
                { backgroundColor: state === 'upcoming' ? colors.border : colors.borderStrong },
                fill,
              ]}
            />
          </View>
        ) : null}
      </View>
      <Animated.View style={[styles.body, { paddingBottom: last ? 0 : space[5] }, body]}>
        {/* The text is one element; children stay outside it so their own controls stay reachable. */}
        <View
          accessible
          accessibilityLabel={`${event.time}, ${event.title}${event.description ? `. ${event.description}` : ''}${status}`}
          style={{ gap: 2 }}
        >
          <View style={styles.head}>
            <Text
              style={{
                flex: 1,
                color: state === 'upcoming' ? colors.textMuted : colors.text,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {event.title}
            </Text>
            <Text
              style={{
                color: state === 'current' ? colors.azure : colors.textSubtle,
                fontSize: font.size.xs,
                fontWeight: font.weight.medium,
                fontVariant: ['tabular-nums'],
              }}
            >
              {event.time}
            </Text>
          </View>
          {event.description ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}>
              {event.description}
            </Text>
          ) : null}
        </View>
        {event.children ? <View style={{ marginTop: space[2] }}>{event.children}</View> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: RAIL, alignItems: 'center' },
  nodeBox: { width: RAIL, height: 22, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RAIL, height: RAIL, borderRadius: RAIL / 2 },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 2 },
  line: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, overflow: 'hidden' },
  lineFill: { width: '100%' },
  body: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 22 },
});
