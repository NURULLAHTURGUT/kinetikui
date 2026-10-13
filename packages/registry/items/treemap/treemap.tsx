import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type TreemapNode = {
  key: string;
  label: string;
  /** Leaf size. Ignored when `children` is set; a parent's size is the sum of its children. */
  value?: number;
  children?: readonly TreemapNode[];
};

export type TreemapProps = {
  data: readonly TreemapNode[];
  /** Height of the map. Defaults to 280. */
  height?: number;
  /** Formats sizes on tiles. Defaults to whole numbers. */
  formatValue?: (value: number) => string;
  /** Names the top level in the trail, e.g. "All spending". Defaults to 'All'. */
  rootLabel?: string;
  /** What the map shows, read first. */
  accessibilityLabel: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export type Rect = { x: number; y: number; w: number; h: number };

const GAP = 3;

export function nodeValue(node: TreemapNode): number {
  return node.children
    ? node.children.reduce((a, c) => a + nodeValue(c), 0)
    : Math.max(0, node.value ?? 0);
}

/** Squarified treemap layout (Bruls, Huizing and van Wijk): tiles as close to square as it can. */
export function squarify(values: readonly number[], rect: Rect): Rect[] {
  const out = new Array<Rect>(values.length);
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) {
    values.forEach((_, i) => (out[i] = { x: rect.x, y: rect.y, w: 0, h: 0 }));
    return out;
  }
  const order = values
    .map((v, i) => ({ i, a: (v / total) * rect.w * rect.h }))
    .sort((p, q) => q.a - p.a);
  let { x, y, w, h } = rect;

  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const place = (row: { i: number; a: number }[]) => {
    const s = row.reduce((acc, r) => acc + r.a, 0);
    if (w >= h) {
      const cw = s / h;
      let cy = y;
      for (const r of row) {
        const rh = r.a / cw;
        out[r.i] = { x, y: cy, w: cw, h: rh };
        cy += rh;
      }
      x += cw;
      w -= cw;
    } else {
      const rh = s / w;
      let cx = x;
      for (const r of row) {
        const rw = r.a / rh;
        out[r.i] = { x: cx, y, w: rw, h: rh };
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
  };

  let row: { i: number; a: number }[] = [];
  for (const item of order) {
    if (item.a <= 0) {
      out[item.i] = { x, y, w: 0, h: 0 };
      continue;
    }
    const side = Math.min(w, h);
    const areas = row.map((r) => r.a);
    if (row.length === 0 || worst([...areas, item.a], side) <= worst(areas, side)) {
      row.push(item);
    } else {
      place(row);
      row = [item];
    }
  }
  if (row.length) place(row);
  return out;
}

/** Maps a rect inside `from` to the same place inside `to`. */
function remap(r: Rect, from: Rect, to: Rect): Rect {
  const sx = to.w / (from.w || 1);
  const sy = to.h / (from.h || 1);
  return { x: to.x + (r.x - from.x) * sx, y: to.y + (r.y - from.y) * sy, w: r.w * sx, h: r.h * sy };
}

/**
 * Sizes as nested tiles, each as square as it can be. Tap a tile with parts
 * and the map zooms into it: the tile grows to fill the frame while its parts
 * open out inside. The trail above zooms back out the same way.
 */
export function Treemap({
  data,
  height = 280,
  formatValue = (v) => String(Math.round(v)),
  rootLabel = 'All',
  accessibilityLabel,
  testID,
  style,
}: TreemapProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  // The drilled path, and where the last zoom started from, so new tiles can grow out of it.
  const [path, setPath] = useState<TreemapNode[]>([]);
  const [origin, setOrigin] = useState<{ rect: Rect; zoomIn: boolean } | null>(null);
  const frame: Rect = { x: 0, y: 0, w: width, h: height };

  const nodes = useMemo(
    () => (path.length ? (path[path.length - 1]!.children ?? []) : data),
    [path, data],
  );
  const total = nodes.reduce((a, n) => a + nodeValue(n), 0);
  const rects = useMemo(
    () => squarify(nodes.map(nodeValue), { x: 0, y: 0, w: width, h: height }),
    [nodes, width, height],
  );
  // Shades by rank: the biggest tile is solid azure, the smallest a pale wash.
  const rank = useMemo(() => {
    const sorted = nodes.map((n, i) => ({ i, v: nodeValue(n) })).sort((a, b) => b.v - a.v);
    const r = new Array<number>(nodes.length);
    sorted.forEach((s, k) => (r[s.i] = nodes.length > 1 ? k / (nodes.length - 1) : 0));
    return r;
  }, [nodes]);

  const zoomInto = (node: TreemapNode, rect: Rect) => {
    setOrigin({ rect, zoomIn: true });
    setPath((p) => [...p, node]);
  };
  const zoomTo = (depth: number) => {
    if (depth >= path.length) return;
    // The tile we leave becomes small again inside its parent's layout.
    const parentNodes = depth === 0 ? data : (path[depth - 1]!.children ?? []);
    const child = path[depth]!;
    const parentRects = squarify(parentNodes.map(nodeValue), frame);
    const at = parentNodes.findIndex((n) => n.key === child.key);
    setOrigin({ rect: parentRects[at] ?? frame, zoomIn: false });
    setPath((p) => p.slice(0, depth));
  };

  const trail = [rootLabel, ...path.map((p) => p.label)];

  return (
    <View testID={testID} style={[{ gap: space[2] }, style]}>
      <View style={styles.trail} accessibilityRole="toolbar" accessibilityLabel="Treemap level">
        {trail.map((label, depth) => {
          const current = depth === trail.length - 1;
          return (
            <View key={`${depth}-${label}`} style={styles.crumb}>
              {depth > 0 ? (
                <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>›</Text>
              ) : null}
              <Pressable
                disabled={current}
                onPress={() => zoomTo(depth)}
                accessibilityRole="button"
                accessibilityLabel={current ? `${label}, current level` : `Back to ${label}`}
                style={styles.crumbHit}
              >
                <Text
                  style={{
                    color: current ? colors.text : colors.azure,
                    fontSize: font.size.sm,
                    fontWeight: current ? font.weight.semibold : font.weight.medium,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View
        accessibilityLabel={accessibilityLabel}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.frame, { height, borderRadius: radius.lg }]}
      >
        {width > 0
          ? nodes.map((node, i) => {
              const to = rects[i]!;
              // New tiles start where the zoom left them: inside the tapped tile, or
              // spread wide around the tile we are leaving.
              const from = origin
                ? origin.zoomIn
                  ? remap(to, frame, origin.rect)
                  : remap(to, origin.rect, frame)
                : to;
              const value = nodeValue(node);
              const share = total > 0 ? value / total : 0;
              const strength = 1 - rank[i]! * 0.7;
              return (
                <Tile
                  key={`${path.length}-${node.key}`}
                  from={from}
                  to={to}
                  reduced={reduced}
                  background={withAlpha(colors.azure, strength)}
                  ink={strength > 0.55 ? colors.onAzure : colors.text}
                  label={node.label}
                  value={formatValue(value)}
                  share={share}
                  hasParts={Boolean(node.children?.length)}
                  radius={radius.sm}
                  onPress={node.children?.length ? () => zoomInto(node, to) : undefined}
                />
              );
            })
          : null}
      </View>
    </View>
  );
}

type TileProps = {
  from: Rect;
  to: Rect;
  reduced: boolean;
  background: string;
  ink: string;
  label: string;
  value: string;
  share: number;
  hasParts: boolean;
  radius: number;
  onPress?: () => void;
};

function Tile({
  from,
  to,
  reduced,
  background,
  ink,
  label,
  value,
  share,
  hasParts,
  radius,
  onPress,
}: TileProps) {
  const { font } = useKinetikTheme();
  const x = useSharedValue(from.x);
  const y = useSharedValue(from.y);
  const w = useSharedValue(from.w);
  const h = useSharedValue(from.h);
  const fade = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    const cfg = spring('smooth', reduced);
    x.set(withSpring(to.x, cfg));
    y.set(withSpring(to.y, cfg));
    w.set(withSpring(to.w, cfg));
    h.set(withSpring(to.h, cfg));
    fade.set(withSpring(1, cfg));
  }, [to.x, to.y, to.w, to.h, reduced, x, y, w, h, fade]);

  const style = useAnimatedStyle(() => ({
    left: x.get() + GAP / 2,
    top: y.get() + GAP / 2,
    width: Math.max(0, w.get() - GAP),
    height: Math.max(0, h.get() - GAP),
    opacity: fade.get(),
  }));

  const roomy = to.w > 64 && to.h > 44;
  const percent = `${Math.round(share * 100)}%`;
  const name = `${label}, ${value}, ${percent}${hasParts ? ', has parts' : ''}`;
  const content = roomy ? (
    <>
      <Text
        numberOfLines={1}
        style={{ color: ink, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: ink, opacity: 0.8, fontSize: font.size.xs, fontVariant: ['tabular-nums'] }}
      >
        {value} · {percent}
      </Text>
    </>
  ) : null;

  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: background, borderRadius: radius }, style]}
    >
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={name}
          accessibilityHint="Zooms in"
          style={styles.press}
        >
          {content}
        </Pressable>
      ) : (
        // Leaves only show their size, so they are text, not a control.
        <View accessible accessibilityRole="text" accessibilityLabel={name} style={styles.press}>
          {content}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trail: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', minHeight: 24 },
  // 44 pt tall to the finger; the negative margin keeps the trail compact.
  crumbHit: { minHeight: 44, justifyContent: 'center', marginVertical: -10 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 },
  frame: { overflow: 'hidden' },
  tile: { position: 'absolute', overflow: 'hidden' },
  press: { flex: 1, padding: 8, gap: 2 },
});
