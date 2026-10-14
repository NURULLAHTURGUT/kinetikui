import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { glow, minTouchTarget, palettes, withAlpha } from '../../shared/tokens/tokens';

export type AgendaEvent = {
  id: string;
  title: string;
  /** Start and end times as shown, e.g. "10:00" and "10:30". */
  start: string;
  end: string;
  /** Colour of the event's bar. Defaults to a blue, violet and teal rotation. */
  color?: string;
  /** For the event happening now: how far through it is, 0–1. Its bar fills to match. */
  progress?: number;
};

export type AgendaCardProps = {
  /** The big date, e.g. "Oct 30". */
  date: string;
  /** The day under it, e.g. "Thursday". */
  weekday: string;
  /** Events in order. The first `limit` are listed. */
  events: readonly AgendaEvent[];
  /** How many events the day has, if more than are listed. Defaults to `events.length`. */
  total?: number;
  /** Most events listed at once. Defaults to 3. */
  limit?: number;
  /** Heading over the list. Defaults to "Upcoming". */
  heading?: string;
  /** Shows the round add button. */
  onAdd?: () => void;
  onEventPress?: (event: AgendaEvent) => void;
  /** A tap on add. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Plus from Tabler Icons (MIT, https://tabler.io/icons), via iconstack.io.
const PLUS = 'M12 5l0 14 M5 12l14 0';
const TONES = ['hsl(224, 90%, 62%)', 'hsl(272, 72%, 62%)', 'hsl(188, 80%, 50%)'];

/**
 * A day-at-a-glance widget: the date on a panel lit from below by a blue
 * glow, and the next events sliding in one after another, each with a colour
 * bar that fills for the event under way. The add button turns as it is
 * pressed, and new events slide in at their place in the list.
 */
export function AgendaCard({
  date,
  weekday,
  events,
  total,
  limit = 3,
  heading = 'Upcoming',
  onAdd,
  onEventPress,
  haptics = true,
  style,
}: AgendaCardProps) {
  const { radius, space, font } = useKinetikTheme();
  // A night-blue slab on either theme, so the glow reads.
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const count = total ?? events.length;
  const shown = events.slice(0, limit);
  // Events there from the start stagger in; ones added later slide in at once.
  const [first] = useState(() => new Set(events.map((e) => e.id)));

  const light = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) light.set(withTiming(1, { duration: 900 }));
  }, [reduced, light]);
  const bump = useSharedValue(1);
  useEffect(() => {
    if (!reduced)
      bump.set(withSequence(withTiming(0.7, { duration: 0 }), withSpring(1, spring('bouncy'))));
  }, [count, reduced, bump]);
  const turn = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: light.get(),
    transform: [{ translateY: (1 - light.get()) * 30 }],
  }));
  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
  const plus = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: 'hsl(224, 20%, 14%)',
          borderColor: withAlpha(colors.highlight, 0.08),
          borderRadius: radius.xl + 4,
          padding: space[3],
          gap: space[4],
        },
        style,
      ]}
    >
      <View
        accessible
        accessibilityLabel={`${weekday}, ${date}, ${count} ${count === 1 ? 'event' : 'events'}`}
        style={[styles.panel, { borderRadius: radius.xl - 4, padding: space[4] }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            gradient(
              'linear-gradient(180deg, hsl(226, 32%, 6%) 0%, hsl(226, 34%, 8%) 42%, hsl(222, 78%, 42%) 82%, hsl(214, 95%, 72%) 100%)',
            ),
            glowStyle,
          ]}
        />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color: colors.highlight,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.semibold,
            letterSpacing: font.tracking.tight,
          }}
        >
          {date}
        </Text>
        <View style={styles.push} />
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
          }}
        >
          {weekday}
        </Text>
        <Animated.View style={[styles.countRow, countStyle]}>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.lg,
              fontWeight: font.weight.semibold,
            }}
          >
            {count} {count === 1 ? 'event' : 'events'}
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.list, { gap: space[2], paddingTop: space[2] }]}>
        <Text
          accessibilityRole="header"
          style={{ color: colors.textMuted, fontSize: font.size.sm, letterSpacing: 0.6 }}
        >
          {heading.toUpperCase()}
        </Text>
        {shown.map((event, i) => (
          <Row
            key={event.id}
            event={event}
            tone={event.color ?? TONES[i % TONES.length]!}
            delay={first.has(event.id) ? 160 + i * 110 : 0}
            onPress={onEventPress ? () => onEventPress(event) : undefined}
          />
        ))}
      </View>

      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add event"
          onPress={() => {
            haptic('tap');
            if (!reduced)
              turn.set(
                withSequence(withSpring(90, spring('snappy')), withTiming(0, { duration: 0 })),
              );
            onAdd();
          }}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.surface,
              borderColor: withAlpha(colors.sky, 0.55),
              boxShadow: glow(colors.sky),
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <Animated.View style={plus}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d={PLUS} stroke={colors.highlight} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({
  event,
  tone,
  delay,
  onPress,
}: {
  event: AgendaEvent;
  tone: string;
  delay: number;
  onPress?: () => void;
}) {
  const { font } = useKinetikTheme();
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const share = Math.max(0, Math.min(1, event.progress ?? 0));
  const fillTo = useSharedValue(reduced ? share : 0);
  // The delay only matters on mount.
  const [wait] = useState(delay);
  useEffect(() => {
    if (reduced) return;
    enter.set(withDelay(wait, withSpring(1, spring('smooth'))));
  }, [wait, reduced, enter]);
  useEffect(() => {
    fillTo.set(reduced ? share : withDelay(400, withTiming(share, timing('slow'))));
  }, [share, reduced, fillTo]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateX: (1 - enter.get()) * 16 }],
  }));
  const fill = useAnimatedStyle(() => ({ height: `${fillTo.get() * 100}%` }));
  const now = event.progress !== undefined;

  const label = `${event.title}, ${event.start} to ${event.end}${now ? ', now' : ''}`;
  const content = (
    <>
      <View
        style={[styles.bar, { backgroundColor: now ? withAlpha(colors.highlight, 0.16) : tone }]}
      >
        {now ? <Animated.View style={[styles.barFill, { backgroundColor: tone }, fill]} /> : null}
      </View>
      <View style={styles.grow}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: font.size.md + 1 }}>
          {event.title}
        </Text>
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: font.size.sm,
            fontVariant: ['tabular-nums'],
          }}
        >
          {event.start} - {event.end}
        </Text>
      </View>
    </>
  );

  return (
    <Animated.View style={style}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={styles.row}
        >
          {content}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={label} style={styles.row}>
          {content}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1 },
  panel: {
    width: '46%',
    minHeight: 200,
    overflow: 'hidden',
    backgroundColor: 'hsl(226, 32%, 6%)',
  },
  push: { flex: 1 },
  countRow: { alignSelf: 'flex-start', transformOrigin: 'left center' },
  list: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: 12, minHeight: minTouchTarget, alignItems: 'stretch' },
  bar: { width: 3, borderRadius: 2, overflow: 'hidden' },
  barFill: { width: 3, borderRadius: 2 },
  grow: { flex: 1, minWidth: 0, justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
