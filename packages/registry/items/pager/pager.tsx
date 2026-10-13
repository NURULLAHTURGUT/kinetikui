import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type PagerProps = {
  /** The current page, from 1. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown on each side of the current one, between the gaps. Defaults to 0. */
  siblings?: number;
  /** Names the control. Defaults to "Pages". */
  accessibilityLabel?: string;
  /** A tick on each change. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export type PagerSlot = number | 'gap';

const CELL = minTouchTarget;

/**
 * The slots to show: the first and last page, the current one with its
 * siblings, and a gap where pages are skipped. Past a few pages the number of
 * slots stays the same, so the control never changes width.
 */
export function pagerSlots(page: number, count: number, siblings = 0): PagerSlot[] {
  const slots = siblings * 2 + 5;
  if (count <= slots) return Array.from({ length: count }, (_, i) => i + 1);
  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, count);
  const leftGap = left > 3;
  const rightGap = right < count - 2;
  const span = 3 + siblings * 2;
  if (!leftGap && rightGap) {
    return [...Array.from({ length: span }, (_, i) => i + 1), 'gap', count];
  }
  if (leftGap && !rightGap) {
    return [1, 'gap', ...Array.from({ length: span }, (_, i) => count - span + i + 1)];
  }
  return [1, 'gap', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), 'gap', count];
}

/**
 * Pagination with a pill that glides to the current page. The row keeps its
 * width: when the window of numbers moves, the digits roll to their new
 * values in place instead of the buttons shifting about.
 */
export function Pager({
  page,
  pageCount,
  onPageChange,
  siblings = 0,
  accessibilityLabel = 'Pages',
  haptics = true,
  testID,
  style,
}: PagerProps) {
  const { colors, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const count = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), count);
  const slots = pagerSlots(current, count, siblings);
  const at = slots.indexOf(current);
  const x = useSharedValue(at * CELL);

  useEffect(() => {
    x.set(reduced ? at * CELL : withSpring(at * CELL, spring('snappy')));
  }, [at, reduced, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), count);
    if (next === current) return;
    haptic('tick');
    onPageChange(next);
  };

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[styles.row, style]}>
      <Arrow dir={-1} disabled={current === 1} onPress={() => go(current - 1)} />
      <View style={styles.slots}>
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: colors.ember, borderRadius: radius.md }, pill]}
        />
        {slots.map((slot, i) =>
          slot === 'gap' ? (
            <View
              key={`gap-${i}`}
              style={styles.cell}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Text style={{ color: colors.textSubtle }}>…</Text>
            </View>
          ) : (
            <Slot
              key={`slot-${i}`}
              value={slot}
              current={slot === current}
              reduced={reduced}
              onPress={() => go(slot)}
            />
          ),
        )}
      </View>
      <Arrow dir={1} disabled={current === count} onPress={() => go(current + 1)} />
    </View>
  );
}

type SlotProps = { value: number; current: boolean; reduced: boolean; onPress: () => void };

/** One numbered button. When its number changes, the old one rolls out and the new one in. */
function Slot({ value, current, reduced, onPress }: SlotProps) {
  const { colors, font } = useKinetikTheme();
  const [roll, setRoll] = useState({ value, prev: value, dir: 1, n: 0 });
  if (roll.value !== value) {
    setRoll({ value, prev: roll.value, dir: value > roll.value ? 1 : -1, n: roll.n + 1 });
  }
  const p = useSharedValue(1);
  useEffect(() => {
    if (roll.n === 0 || reduced) return;
    p.set(0);
    p.set(withTiming(1, { duration: durations.base, easing: easings.standard }));
  }, [roll.n, reduced, p]);

  const incoming = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * 10 * roll.dir }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - p.get(),
    transform: [{ translateY: -p.get() * 10 * roll.dir }],
  }));
  const text = {
    color: current ? colors.onEmber : colors.text,
    fontSize: font.size.md,
    fontWeight: current ? font.weight.semibold : font.weight.regular,
    fontVariant: ['tabular-nums' as const],
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Page ${value}`}
      accessibilityState={{ selected: current }}
      style={styles.cell}
    >
      {roll.prev !== roll.value ? (
        <Animated.Text style={[text, styles.ghost, outgoing]}>{roll.prev}</Animated.Text>
      ) : null}
      <Animated.Text style={[text, incoming]}>{value}</Animated.Text>
    </Pressable>
  );
}

function Arrow({
  dir,
  disabled,
  onPress,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useKinetikTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={dir === 1 ? 'Next page' : 'Previous page'}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.cell,
        {
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.surfaceSunken : undefined,
          opacity: disabled ? 0.3 : 1,
        },
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
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  slots: { flexDirection: 'row' },
  pill: { position: 'absolute', left: 4, top: 4, width: CELL - 8, height: CELL - 8 },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ghost: { position: 'absolute' },
  icon: { width: 14, height: 14 },
  stroke: { position: 'absolute', width: 8, height: 1.8, borderRadius: 1, left: 4 },
  up: { top: 4.2, transform: [{ rotate: '45deg' }] },
  down: { top: 8.8, transform: [{ rotate: '-45deg' }] },
});
