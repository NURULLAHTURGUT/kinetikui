import {
  BackdropBlur,
  Canvas,
  Group,
  Path,
  RoundedRect,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type FolderItem = {
  /** An SVG path on a 24 pt grid, drawn as a bold stroke (any Tabler icon works, from https://iconstack.io). */
  glyph: string;
  /** Stroke colour of the glyph. */
  color: string;
};

export type PeekFolderProps = {
  /** Read by screen readers, e.g. "Fonts". */
  label: string;
  /** Up to three tiles, left, middle, right. */
  items: readonly FolderItem[];
  /** Open state, if you control it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shows the round arrow button on the pocket. */
  onOpen?: () => void;
  /** Lift the tiles while a pointer hovers (web), without opening. Defaults to true. */
  hover?: boolean;
  /** A tap as the folder opens and closes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Tile poses at rest and lifted, on a 300 × 258 stage: x, y, turn in degrees. */
const POSES = [
  { rest: [96, 138, -10], open: [74, 92, -17] },
  { rest: [150, 118, 0], open: [150, 66, -2] },
  { rest: [204, 142, 9], open: [226, 96, 15] },
] as const;
/** Middle first, so the side tiles overlap it. */
const DRAW_ORDER = [1, 0, 2];
const TILE = 100;

/** Arrow up-right from Tabler Icons (MIT, https://tabler.io/icons). */
// Drawn with SVG: a Skia canvas for one small icon would be a GPU surface of its own.
const ARROW = 'M17 7l-10 10 M8 7l9 0l0 9';

function pocketPath(u: number): SkPath {
  const L = 16 * u;
  const R = 284 * u;
  const T1 = 146 * u;
  const T2 = 164 * u;
  const B = 252 * u;
  const r = 18 * u;
  const sx = 132 * u;
  const sw = 30 * u;
  return Skia.PathBuilder.Make()
    .moveTo(L, T1 + r)
    .quadTo(L, T1, L + r, T1)
    .lineTo(sx, T1)
    .cubicTo(sx + sw * 0.5, T1, sx + sw * 0.5, T2, sx + sw, T2)
    .lineTo(R - r, T2)
    .quadTo(R, T2, R, T2 + r)
    .lineTo(R, B - r)
    .quadTo(R, B, R - r, B)
    .lineTo(L + r, B)
    .quadTo(L, B, L, B - r)
    .close()
    .detach();
}

function backPath(u: number): SkPath {
  return (
    Skia.PathBuilder.Make()
      // The same width as the pocket in front, so the folder reads as one object.
      .addRRect(Skia.RRectXY(Skia.XYWHRect(16 * u, 74 * u, 268 * u, 178 * u), 18 * u, 18 * u))
      .addRRect(Skia.RRectXY(Skia.XYWHRect(16 * u, 58 * u, 104 * u, 40 * u), 14 * u, 14 * u))
      .detach()
  );
}

/**
 * A folder with tiles tucked into a frosted-glass pocket, their colours
 * glowing through the glass. Tap it, or hover on the web, and the tiles
 * spring up and fan out; tap again and they drop back in.
 */
export function PeekFolder({
  label,
  items,
  open: controlled,
  onOpenChange,
  onOpen,
  hover = true,
  haptics = true,
  style,
}: PeekFolderProps) {
  const { colors, scheme, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [own, setOwn] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [width, setWidth] = useState(0);
  const open = controlled ?? own;
  // A hover only lifts the tiles for as long as it lasts; a tap opens the folder.
  const raised = open || (hover && hovered);

  const lift = useSharedValue(raised ? 1 : 0);
  useEffect(() => {
    lift.set(reduced ? (raised ? 1 : 0) : withSpring(raised ? 1 : 0, spring('bouncy')));
  }, [raised, reduced, lift]);

  const toggle = () => {
    haptic('tap');
    if (controlled === undefined) setOwn(!open);
    onOpenChange?.(!open);
  };

  const u = width / 300;
  const height = 258 * u;
  const pocket = useMemo(() => (width > 0 ? pocketPath(u) : null), [width, u]);
  const back = useMemo(() => (width > 0 ? backPath(u) : null), [width, u]);
  const dark = scheme === 'dark';

  return (
    <View
      style={[styles.host, style]}
      onLayout={(e) => setWidth(Math.min(340, e.nativeEvent.layout.width))}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={open ? 'Tucks the items away' : 'Shows what is inside'}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        onHoverIn={hover ? () => setHovered(true) : undefined}
        onHoverOut={hover ? () => setHovered(false) : undefined}
        style={{ width: width || '100%', height: height || 240 }}
      >
        {pocket && !dark ? (
          // The pocket's shadow lives outside the canvas, so it is not redrawn as the tiles move.
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 16 * u,
              top: 164 * u,
              width: 268 * u,
              height: 88 * u,
              borderRadius: 18 * u,
              boxShadow: shadow.lg,
            }}
          />
        ) : null}
        {pocket && back ? (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path path={back} color={colors.skeleton} />
            {DRAW_ORDER.map((i) =>
              items[i] ? <Tile key={i} index={i} item={items[i]} u={u} lift={lift} /> : null,
            )}
            {/* The glass: everything behind it blurred. */}
            <BackdropBlur blur={11 * u} clip={pocket}>
              <Path path={pocket} color={withAlpha(colors.surfaceRaised, dark ? 0.55 : 0.5)} />
            </BackdropBlur>
            <Path
              path={pocket}
              style="stroke"
              strokeWidth={1.5}
              color={withAlpha(colors.highlight, dark ? 0.16 : 0.95)}
            />
          </Canvas>
        ) : null}
      </Pressable>

      {onOpen && width > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${label}`}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.arrowHit,
            {
              left: 284 * u - 18 * u - minTouchTarget + 4,
              top: 252 * u - 18 * u - minTouchTarget + 4,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <View
            style={[
              styles.arrow,
              { backgroundColor: colors.ember, borderColor: withAlpha(colors.highlight, 0.9) },
            ]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" pointerEvents="none">
              <SvgPath
                d={ARROW}
                stroke={colors.onEmber}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

/** One tile, dropping in on arrival and fanning out when the folder opens. */
function Tile({
  index,
  item,
  u,
  lift,
}: {
  index: number;
  item: FolderItem;
  u: number;
  lift: SharedValue<number>;
}) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const glyph = useMemo(
    () => Skia.Path.MakeFromSVGString(item.glyph) ?? Skia.Path.Make(),
    [item.glyph],
  );
  const drop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) drop.set(withDelay(160 + index * 110, withSpring(1, spring('bouncy'))));
  }, [index, reduced, drop]);

  const pose = POSES[index]!;
  const transform = useDerivedValue(() => {
    const o = lift.get();
    const x = pose.rest[0] + (pose.open[0] - pose.rest[0]) * o;
    const y = pose.rest[1] + (pose.open[1] - pose.rest[1]) * o - (1 - drop.get()) * 90;
    const turn = pose.rest[2] + (pose.open[2] - pose.rest[2]) * o;
    return [{ translateX: x * u }, { translateY: y * u }, { rotate: (turn * Math.PI) / 180 }];
  });
  const opacity = useDerivedValue(() => Math.min(1, drop.get() * 2));
  const s = TILE * u;
  const g = 2.7 * u;

  return (
    <Group transform={transform} opacity={opacity}>
      {/* A soft shadow from two offset layers: no blur to redraw while the tile moves. */}
      <RoundedRect
        x={-s / 2 - 2 * u}
        y={-s / 2 + 7 * u}
        width={s + 4 * u}
        height={s}
        r={20 * u}
        color={withAlpha(colors.text, 0.04)}
      />
      <RoundedRect
        x={-s / 2}
        y={-s / 2 + 3 * u}
        width={s}
        height={s}
        r={18 * u}
        color={withAlpha(colors.text, 0.06)}
      />
      <RoundedRect
        x={-s / 2}
        y={-s / 2}
        width={s}
        height={s}
        r={18 * u}
        color={colors.surfaceRaised}
      />
      <RoundedRect
        x={-s / 2}
        y={-s / 2}
        width={s}
        height={s}
        r={18 * u}
        style="stroke"
        strokeWidth={1}
        color={colors.border}
      />
      <Group transform={[{ scale: g }, { translateX: -12 }, { translateY: -12 }]}>
        <Path
          path={glyph}
          style="stroke"
          strokeWidth={2.6}
          strokeCap="round"
          strokeJoin="round"
          color={item.color}
        />
      </Group>
    </Group>
  );
}

const styles = StyleSheet.create({
  host: { width: '100%', maxWidth: 340, alignSelf: 'center' },
  arrowHit: {
    position: 'absolute',
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
