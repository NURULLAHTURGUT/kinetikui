import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type TimeValue = { hours: number; minutes: number };

export type TimeWheelProps = {
  /** Hours 0–23 and minutes 0–59. */
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  /** Minutes step by this much. Defaults to 1. */
  minuteStep?: number;
  /** "12h" adds an AM/PM wheel. Defaults to "24h". */
  hourCycle?: '12h' | '24h';
  /** Names the picker for screen readers. Defaults to "Time". */
  accessibilityLabel?: string;
  /** A tick for every row that passes the middle. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ROW = 40;
const VISIBLE = 5;
const HEIGHT = ROW * VISIBLE;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Wheels for a time of day, like a drum seen side-on. Rows tilt away and fade
 * above and below the middle band, each wheel snaps row by row with a tick,
 * and the value is set when it comes to rest.
 */
export function TimeWheel({
  value,
  onChange,
  minuteStep = 1,
  hourCycle = '24h',
  accessibilityLabel = 'Time',
  haptics = true,
  testID,
  style,
}: TimeWheelProps) {
  const { colors, font, radius } = useKinetikTheme();
  const twelve = hourCycle === '12h';
  const step = Math.max(1, Math.min(30, Math.floor(minuteStep)));

  const hours = twelve
    ? Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
    : Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
  const pm = value.hours >= 12;
  const hourIndex = twelve ? value.hours % 12 : value.hours;
  const minuteIndex = Math.min(minutes.length - 1, Math.round(value.minutes / step));

  const setHour = (i: number) => {
    const h = twelve ? (i % 12) + (pm ? 12 : 0) : i;
    if (h !== value.hours) onChange({ hours: h, minutes: value.minutes });
  };
  const setMinute = (i: number) => {
    const m = minutes[i] ?? 0;
    if (m !== value.minutes) onChange({ hours: value.hours, minutes: m });
  };
  const setHalf = (i: number) => {
    const next = (value.hours % 12) + (i === 1 ? 12 : 0);
    if (next !== value.hours) onChange({ hours: next, minutes: value.minutes });
  };

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[styles.root, style]}>
      <View
        pointerEvents="none"
        style={[styles.band, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}
      />
      <Wheel
        label={`${accessibilityLabel}, hours`}
        testID={testID ? `${testID}-hours` : undefined}
        items={hours.map((h) => (twelve ? String(h) : pad(h)))}
        index={hourIndex}
        onIndex={setHour}
        haptics={haptics}
      />
      <Text
        style={[
          styles.colon,
          { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.semibold },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        :
      </Text>
      <Wheel
        label={`${accessibilityLabel}, minutes`}
        testID={testID ? `${testID}-minutes` : undefined}
        items={minutes.map(pad)}
        index={minuteIndex}
        onIndex={setMinute}
        haptics={haptics}
      />
      {twelve ? (
        <Wheel
          label={`${accessibilityLabel}, AM or PM`}
          items={['AM', 'PM']}
          index={pm ? 1 : 0}
          onIndex={setHalf}
          haptics={haptics}
          narrow
        />
      ) : null}
    </View>
  );
}

type WheelProps = {
  label: string;
  testID?: string;
  items: readonly string[];
  index: number;
  onIndex: (index: number) => void;
  haptics: boolean;
  narrow?: boolean;
};

function Wheel({ label, items, index, onIndex, haptics, narrow, testID }: WheelProps) {
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const y = useSharedValue(index * ROW);
  const passing = useSharedValue(index);
  const dragging = useSharedValue(false);
  const last = items.length - 1;
  // The first scroll to the value jumps (contentOffset on native; the web ignores
  // that prop, so it is set again here). Later ones animate.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      ref.current?.scrollTo({ y: index * ROW, animated: false });
      return;
    }
    if (dragging.get()) return;
    if (Math.round(y.get() / ROW) === index) return;
    ref.current?.scrollTo({ y: index * ROW, animated: !reduced });
  }, [index, reduced, ref, y, dragging]);

  const settle = (i: number) => onIndex(Math.max(0, Math.min(last, i)));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.set(e.contentOffset.y);
      const i = Math.max(0, Math.min(last, Math.round(e.contentOffset.y / ROW)));
      if (i !== passing.get()) {
        passing.set(i);
        if (dragging.get()) scheduleOnRN(haptic, 'tick');
      }
    },
    onBeginDrag: () => {
      dragging.set(true);
    },
    onEndDrag: (e) => {
      // Without a fling there is no momentum phase, so the wheel settles here.
      if (Math.abs(e.velocity?.y ?? 0) < 0.05) {
        dragging.set(false);
        scheduleOnRN(settle, Math.round(e.contentOffset.y / ROW));
      }
    },
    onMomentumEnd: (e) => {
      dragging.set(false);
      scheduleOnRN(settle, Math.round(e.contentOffset.y / ROW));
    },
  });

  const nudge = (e: AccessibilityActionEvent) => {
    const next = index + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    if (next >= 0 && next <= last) onIndex(next);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] ?? '' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={nudge}
      style={[styles.wheel, narrow && styles.narrow]}
    >
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: index * ROW }}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        testID={testID}
      >
        {items.map((item, i) => (
          <Row key={item} text={item} index={i} y={y} reduced={reduced} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function Row({
  text,
  index,
  y,
  reduced,
}: {
  text: string;
  index: number;
  y: SharedValue<number>;
  reduced: boolean;
}) {
  const { colors, font } = useKinetikTheme();
  const motion = useAnimatedStyle(() => {
    const d = (index * ROW - y.get()) / ROW;
    const a = Math.min(Math.abs(d), 3);
    return {
      opacity: 1 - a * 0.3,
      transform: reduced
        ? []
        : [
            { perspective: 500 },
            { rotateX: `${Math.max(-70, Math.min(70, -d * 24))}deg` },
            { scale: 1 - a * 0.05 },
          ],
    };
  });
  return (
    <Animated.View style={[styles.row, motion]}>
      <Text
        style={{
          color: colors.text,
          fontSize: font.size.xl,
          fontWeight: font.weight.medium,
          fontVariant: ['tabular-nums'],
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  band: { position: 'absolute', left: 0, right: 0, top: (HEIGHT - ROW) / 2, height: ROW },
  wheel: { width: 72, height: HEIGHT },
  narrow: { width: 64 },
  content: { paddingVertical: (HEIGHT - ROW) / 2 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  colon: { marginTop: -3 },
});
