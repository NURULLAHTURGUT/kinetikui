import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type SortValue = string | number;
export type SortRow = { id: string } & Record<string, SortValue>;

export type SortColumn = {
  key: string;
  title: string;
  /** Numbers read best right-aligned. Defaults to "left". */
  align?: 'left' | 'right';
  /** Share of the width. Defaults to 1. */
  flex?: number;
  /** Formats a cell for display; sorting uses the raw value. */
  format?: (value: SortValue, row: SortRow) => string;
  /** Defaults to true. */
  sortable?: boolean;
};

export type SortState = { key: string; dir: 'asc' | 'desc' };

export type SortTableProps = {
  columns: readonly SortColumn[];
  rows: readonly SortRow[];
  initialSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** A tick when the order changes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ROW = 48;
const HEAD = 44;

/** Rows in order for a sort: numbers by size, text alphabetically; ties keep their order. */
export function sortRows(rows: readonly SortRow[], sort: SortState | null): SortRow[] {
  if (!sort) return [...rows];
  const sign = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const x = a.row[sort.key];
      const y = b.row[sort.key];
      const c =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x ?? '').localeCompare(String(y ?? ''));
      return c === 0 ? a.i - b.i : c * sign;
    })
    .map((e) => e.row);
}

/**
 * A table you sort by tapping a column. Rows do not jump: each one springs
 * from its old place to its new one, the arrow in the header turns to show
 * the direction, and the sorted column's cells come forward.
 */
export function SortTable({
  columns,
  rows,
  initialSort,
  onSortChange,
  haptics = true,
  testID,
  style,
}: SortTableProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const order = sortRows(rows, sort);
  const place = new Map(order.map((r, i) => [r.id, i]));

  const press = (col: SortColumn) => {
    // A new column sorts numbers high to low and text A to Z; the same column flips.
    const numeric = typeof rows[0]?.[col.key] === 'number';
    const next: SortState =
      sort?.key === col.key
        ? { key: col.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: numeric ? 'desc' : 'asc' };
    haptic('tick');
    setSort(next);
    onSortChange?.(next);
  };

  return (
    <View
      testID={testID}
      style={[styles.root, { borderColor: colors.border, borderRadius: radius.lg }, style]}
    >
      <View style={[styles.head, { borderBottomColor: colors.borderStrong }]}>
        {columns.map((col) => {
          const active = sort?.key === col.key;
          const sortable = col.sortable !== false;
          const state = active
            ? `sorted ${sort?.dir === 'asc' ? 'ascending' : 'descending'}`
            : sortable
              ? 'not sorted'
              : '';
          return (
            <Pressable
              key={col.key}
              onPress={() => press(col)}
              disabled={!sortable}
              accessibilityRole="button"
              accessibilityLabel={state ? `${col.title}, ${state}` : col.title}
              style={[
                styles.headCell,
                { flex: col.flex ?? 1 },
                col.align === 'right' && styles.right,
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: active ? colors.text : colors.textMuted,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.semibold,
                  letterSpacing: font.tracking.wide,
                }}
              >
                {col.title.toUpperCase()}
              </Text>
              {sortable ? (
                <Arrow on={active} up={active && sort?.dir === 'asc'} reduced={reduced} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: rows.length * ROW }}>
        {rows.map((row) => (
          <Row
            key={row.id}
            row={row}
            index={place.get(row.id) ?? 0}
            last={(place.get(row.id) ?? 0) === rows.length - 1}
            columns={columns}
            sortKey={sort?.key}
            reduced={reduced}
          />
        ))}
      </View>
    </View>
  );
}

type RowProps = {
  row: SortRow;
  index: number;
  last: boolean;
  columns: readonly SortColumn[];
  sortKey: string | undefined;
  reduced: boolean;
};

function Row({ row, index, last, columns, sortKey, reduced }: RowProps) {
  const { colors, font } = useKinetikTheme();
  const y = useSharedValue(index * ROW);
  useEffect(() => {
    y.set(withSpring(index * ROW, spring('smooth', reduced)));
  }, [index, reduced, y]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const label = columns
    .map((c) => `${c.title}: ${c.format ? c.format(row[c.key]!, row) : String(row[c.key] ?? '')}`)
    .join(', ');

  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
        motion,
      ]}
    >
      {columns.map((c) => {
        const v = row[c.key];
        const text = c.format ? c.format(v!, row) : String(v ?? '');
        return (
          <Text
            key={c.key}
            numberOfLines={1}
            style={[
              styles.cell,
              { flex: c.flex ?? 1 },
              c.align === 'right' && styles.textRight,
              {
                color: c.key === sortKey ? colors.text : colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: c.key === sortKey ? font.weight.semibold : font.weight.regular,
                fontVariant: ['tabular-nums'],
              },
            ]}
          >
            {text}
          </Text>
        );
      })}
    </Animated.View>
  );
}

function Arrow({ on, up, reduced }: { on: boolean; up: boolean; reduced: boolean }) {
  const { colors } = useKinetikTheme();
  const turn = useSharedValue(up ? 1 : 0);
  const shown = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    turn.set(withSpring(up ? 1 : 0, spring('snappy', reduced)));
    shown.set(withTiming(on ? 1 : 0.25, timing('quick', reduced)));
  }, [up, on, reduced, turn, shown]);
  const motion = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ rotate: `${turn.get() * 180}deg` }],
  }));
  return (
    <Animated.View style={[styles.arrow, motion]}>
      <View style={[styles.stroke, styles.l, { backgroundColor: colors.text }]} />
      <View style={[styles.stroke, styles.r, { backgroundColor: colors.text }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { borderWidth: 1, overflow: 'hidden' },
  head: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  headCell: {
    height: HEAD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  right: { justifyContent: 'flex-end' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cell: { paddingHorizontal: 6 },
  textRight: { textAlign: 'right' },
  arrow: { width: 10, height: 10 },
  stroke: { position: 'absolute', top: 4.5, width: 5.5, height: 1.5, borderRadius: 1 },
  l: { left: 0.6, transform: [{ rotate: '40deg' }] },
  r: { right: 0.6, transform: [{ rotate: '-40deg' }] },
});
