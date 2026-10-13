import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type DateRange = { start: Date | null; end: Date | null };

type Common = {
  /** The month shown first. Defaults to the selected date's month, or today's. */
  initialMonth?: Date;
  /** Days before this cannot be chosen. */
  minDate?: Date;
  /** Days after this cannot be chosen. */
  maxDate?: Date;
  /** Days that get a small dot, e.g. days with events. */
  marked?: readonly Date[];
  /** 0 for Sunday, 1 for Monday. Defaults to 1. */
  weekStartsOn?: 0 | 1;
  /** Twelve month names. Defaults to English. */
  monthNames?: readonly string[];
  /** Seven weekday names starting on Sunday. Defaults to English. */
  dayNames?: readonly string[];
  onMonthChange?: (month: Date) => void;
  /** A tick on each choice. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export type MonthCalendarProps = Common &
  (
    | { mode?: 'single'; value: Date | null; onChange: (date: Date) => void }
    | { mode: 'range'; range: DateRange; onRangeChange: (range: DateRange) => void }
  );

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CELL = 44;
const DISC = 38;

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const dayKey = (d: Date) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
const sameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  Boolean(a && b && dayKey(a) === dayKey(b));
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** The 42 days (six weeks) shown for a month, starting on `weekStartsOn`. */
export function monthGrid(month: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const first = startOfMonth(month);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  return Array.from(
    { length: 42 },
    (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i),
  );
}

/**
 * A month of days to pick one date or a range. A disc glides from day to day
 * within the month, a new month slides in from the side you are heading to,
 * and a swipe across the grid turns the page. In range mode a soft band
 * joins the two ends, row by row.
 */
export function MonthCalendar(props: MonthCalendarProps) {
  const {
    initialMonth,
    minDate,
    maxDate,
    marked,
    weekStartsOn = 1,
    monthNames = MONTHS,
    dayNames = DAYS,
    onMonthChange,
    haptics = true,
    testID,
    style,
  } = props;
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const range = props.mode === 'range' ? props.range : null;
  const single = props.mode === 'range' ? null : props.value;

  const [view, setView] = useState(() => ({
    month: startOfMonth(initialMonth ?? single ?? range?.start ?? new Date()),
    dir: 0,
  }));
  const [width, setWidth] = useState(0);
  const cw = width / 7;
  const days = monthGrid(view.month, weekStartsOn);
  const today = new Date();
  const markedKeys = new Set((marked ?? []).map(dayKey));
  const lo = minDate ? dayKey(minDate) : -Infinity;
  const hi = maxDate ? dayKey(maxDate) : Infinity;

  const turn = (n: number) => {
    const month = addMonths(view.month, n);
    haptic('tick');
    setView({ month, dir: n });
    onMonthChange?.(month);
  };

  const pick = (d: Date) => {
    haptic('tick');
    if (props.mode !== 'range') {
      props.onChange(d);
      return;
    }
    const { start, end } = props.range;
    if (!start || end || dayKey(d) < dayKey(start)) props.onRangeChange({ start: d, end: null });
    else props.onRangeChange({ start, end: d });
  };

  // The disc for a single date glides within a month and jumps across months.
  const at = single
    ? days.findIndex((d) => sameDay(d, single) && d.getMonth() === view.month.getMonth())
    : -1;
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const shown = useSharedValue(0);
  const placed = useRef<number | null>(null);
  const monthKey = view.month.getTime();
  useEffect(() => {
    if (at < 0 || cw === 0) {
      shown.set(withTiming(0, { duration: durations.quick }));
      placed.current = null;
      return;
    }
    const tx = (at % 7) * cw + (cw - DISC) / 2;
    const ty = Math.floor(at / 7) * CELL + (CELL - DISC) / 2;
    if (reduced || placed.current !== monthKey) {
      x.set(tx);
      y.set(ty);
      shown.set(reduced ? 1 : withSpring(1, spring('bouncy')));
    } else {
      x.set(withSpring(tx, spring('smooth')));
      y.set(withSpring(ty, spring('smooth')));
      shown.set(1);
    }
    placed.current = monthKey;
  }, [at, cw, monthKey, reduced, x, y, shown]);
  const disc = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: 0.6 + shown.get() * 0.4 },
    ],
  }));

  const swipe = Gesture.Pan()
    .withTestId('month-calendar')
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 48 && Math.abs(e.velocityX) < 400) return;
      scheduleOnRN(turn, e.translationX < 0 ? 1 : -1);
    });

  const order = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
  const title = `${monthNames[view.month.getMonth()]} ${view.month.getFullYear()}`;

  return (
    <View testID={testID} style={style}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          {title}
        </Text>
        <View style={styles.arrows}>
          <Arrow dir={-1} label="Previous month" onPress={() => turn(-1)} />
          <Arrow dir={1} label="Next month" onPress={() => turn(1)} />
        </View>
      </View>
      <View style={styles.week}>
        {order.map((d) => (
          <Text
            key={d}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.weekday, { color: colors.textSubtle, fontSize: font.size.xs }]}
          >
            {(dayNames[d] ?? '').slice(0, 2)}
          </Text>
        ))}
      </View>
      <GestureDetector gesture={swipe}>
        <View
          collapsable={false}
          style={styles.gridBox}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <Page key={monthKey} dir={view.dir} reduced={reduced}>
            {range && width > 0 ? (
              <Band days={days} month={view.month} range={range} cw={cw} radius={radius.pill} />
            ) : null}
            {single !== null ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.disc, { backgroundColor: colors.azure }, disc]}
              />
            ) : null}
            <View style={styles.grid}>
              {days.map((d) => {
                const k = dayKey(d);
                const inMonth = d.getMonth() === view.month.getMonth();
                const disabled = !inMonth || k < lo || k > hi;
                const end = range !== null && (sameDay(d, range.start) || sameDay(d, range.end));
                const chosen = (inMonth && sameDay(d, single)) || (inMonth && end);
                const isToday = sameDay(d, today);
                const name = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                return (
                  <Pressable
                    key={k}
                    onPress={() => pick(d)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={isToday ? `Today, ${name}` : name}
                    accessibilityState={{ selected: chosen, disabled }}
                    accessibilityElementsHidden={!inMonth}
                    importantForAccessibility={inMonth ? 'auto' : 'no-hide-descendants'}
                    style={styles.cell}
                  >
                    <Text
                      style={{
                        color: chosen ? colors.onAzure : isToday ? colors.azure : colors.text,
                        opacity: !inMonth ? 0.28 : disabled ? 0.4 : 1,
                        fontSize: font.size.md,
                        fontWeight: chosen || isToday ? font.weight.semibold : font.weight.regular,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {d.getDate()}
                    </Text>
                    {inMonth && markedKeys.has(k) ? (
                      <View
                        style={[
                          styles.mark,
                          { backgroundColor: chosen ? colors.onAzure : colors.azure },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Page>
        </View>
      </GestureDetector>
    </View>
  );
}

/** A month's grid; a new one slides in from the side being turned to. */
function Page({ dir, reduced, children }: { dir: number; reduced: boolean; children: ReactNode }) {
  const p = useSharedValue(dir === 0 || reduced ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(1, { duration: durations.base, easing: easings.standard }));
  }, [p]);
  const motion = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateX: (1 - p.get()) * 36 * dir }],
  }));
  return <Animated.View style={motion}>{children}</Animated.View>;
}

type BandProps = { days: Date[]; month: Date; range: DateRange; cw: number; radius: number };

/** The range drawn row by row: a soft band between the ends and a disc on each end. */
function Band({ days, month, range, cw, radius }: BandProps) {
  const { colors } = useKinetikTheme();
  if (!range.start) return null;
  const a = dayKey(range.start);
  const b = range.end ? dayKey(range.end) : a;
  const pieces: ReactNode[] = [];
  for (let row = 0; row < 6; row++) {
    const cols: number[] = [];
    for (let c = 0; c < 7; c++) {
      const d = days[row * 7 + c]!;
      const k = dayKey(d);
      if (d.getMonth() === month.getMonth() && k >= a && k <= b) cols.push(c);
    }
    if (cols.length === 0) continue;
    const first = cols[0]!;
    const last = cols[cols.length - 1]!;
    const top = row * CELL + (CELL - DISC) / 2;
    if (range.end && a !== b) {
      pieces.push(
        <View
          key={`band-${row}`}
          style={[
            styles.band,
            {
              top,
              left: first * cw + (cw - DISC) / 2,
              width: (last - first) * cw + DISC,
              backgroundColor: colors.azureSoft,
              borderRadius: radius,
            },
          ]}
        />,
      );
    }
    for (const c of cols) {
      const k = dayKey(days[row * 7 + c]!);
      if (k === a || k === b) {
        pieces.push(
          <View
            key={`end-${k}`}
            style={[
              styles.band,
              {
                top,
                left: c * cw + (cw - DISC) / 2,
                width: DISC,
                backgroundColor: colors.azure,
                borderRadius: radius,
              },
            ]}
          />,
        );
      }
    }
  }
  return <>{pieces}</>;
}

function Arrow({ dir, label, onPress }: { dir: 1 | -1; label: string; onPress: () => void }) {
  const { colors, radius } = useKinetikTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.arrow,
        { borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceSunken : undefined },
      ]}
    >
      <View style={[styles.icon, { transform: [{ scaleX: dir }] }]}>
        <View style={[styles.stroke, styles.up, { backgroundColor: colors.text }]} />
        <View style={[styles.stroke, styles.down, { backgroundColor: colors.text }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 4,
    marginBottom: 4,
  },
  arrows: { flexDirection: 'row' },
  arrow: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 14, height: 14 },
  stroke: { position: 'absolute', width: 8, height: 1.8, borderRadius: 1, left: 4 },
  up: { top: 4.2, transform: [{ rotate: '45deg' }] },
  down: { top: 8.8, transform: [{ rotate: '-45deg' }] },
  week: { flexDirection: 'row', marginBottom: 2 },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 6 },
  gridBox: { height: CELL * 6, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: CELL, alignItems: 'center', justifyContent: 'center' },
  mark: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
  disc: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
  },
  band: { position: 'absolute', height: DISC },
});
