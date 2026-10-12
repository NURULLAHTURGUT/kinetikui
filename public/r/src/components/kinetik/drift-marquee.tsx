import { Children, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';

export type DriftMarqueeProps = {
  /** The items. Each child is laid out `itemWidth` wide. */
  children: ReactNode;
  itemWidth: number;
  /** Height of the row, including 8 pt above and below the items for their lean. Defaults to 180. */
  height?: number;
  /** Space between items. Defaults to 12. */
  gap?: number;
  /** Drift speed in pt per second. 0 holds still until dragged. Defaults to 32. */
  speed?: number;
  /** Which way the row drifts. Defaults to `left`. */
  direction?: 'left' | 'right';
  /** Let the row be dragged and flung. Defaults to true. */
  draggable?: boolean;
  /** How far items lean into fast movement, 0–1. Defaults to 0.6. */
  lean?: number;
  /** Pause drifting, e.g. while off-screen. Defaults to true. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Fling speeds are clamped to this many pt per second. */
const MAX_FLING = 4200;

/**
 * An endless row that drifts on its own. Grab it to scrub, fling it to send
 * it spinning; it eases back to its drift, and the items lean into the
 * speed as they pass.
 */
export function DriftMarquee({
  children,
  itemWidth,
  height = 180,
  gap = 12,
  speed = 32,
  direction = 'left',
  draggable = true,
  lean = 0.6,
  active = true,
  style,
}: DriftMarqueeProps) {
  const reduced = useReduceMotion();
  const items = Children.toArray(children);
  const n = items.length;
  const [width, setWidth] = useState(0);

  const step = itemWidth + gap;
  const total = Math.max(1, n * step);
  // Enough copies of the row to cover the view plus one item on each side.
  const copies = n === 0 ? 0 : Math.max(1, Math.ceil((width + step * 2) / total));
  const span = total * copies;

  const base = reduced ? 0 : (direction === 'left' ? 1 : -1) * Math.max(0, speed);
  const offset = useSharedValue(0);
  const velocity = useSharedValue(base);
  const dragging = useSharedValue(false);
  const start = useSharedValue(0);

  const frame = useFrameCallback((info) => {
    if (dragging.get()) return;
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    // A fling eases back to the resting drift.
    const v = base + (velocity.get() - base) * Math.exp(-3.2 * dt);
    velocity.set(v);
    offset.set(offset.get() + v * dt);
  }, false);

  useEffect(() => {
    frame.setActive(active && n > 0);
    // `frame` is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, n]);

  const pan = Gesture.Pan()
    .withTestId('drift-marquee')
    .enabled(draggable && n > 0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      start.set(offset.get());
    })
    .onStart(() => {
      dragging.set(true);
    })
    .onUpdate((e) => {
      offset.set(start.get() - e.translationX);
      velocity.set(Math.max(-MAX_FLING, Math.min(MAX_FLING, -e.velocityX)));
    })
    .onFinalize(() => {
      dragging.set(false);
    });

  const tilt = reduced ? 0 : Math.max(0, Math.min(1, lean));

  return (
    <GestureDetector gesture={pan}>
      <View
        collapsable={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.row, { height }, style]}
      >
        {width > 0 &&
          Array.from({ length: copies }, (_, c) =>
            items.map((item, i) => (
              <Slot
                key={`${c}-${i}`}
                slot={c * n + i}
                step={step}
                span={span}
                width={itemWidth}
                offset={offset}
                velocity={velocity}
                base={base}
                tilt={tilt}
                hidden={c > 0}
              >
                {item}
              </Slot>
            )),
          )}
      </View>
    </GestureDetector>
  );
}

function Slot({
  children,
  slot,
  step,
  span,
  width,
  offset,
  velocity,
  base,
  tilt,
  hidden,
}: {
  children: ReactNode;
  slot: number;
  step: number;
  span: number;
  width: number;
  offset: SharedValue<number>;
  velocity: SharedValue<number>;
  base: number;
  tilt: number;
  hidden: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // Wrap around: positions run from one item before the left edge onward.
    const raw = (slot * step - offset.get()) % span;
    const x = (raw < 0 ? raw + span : raw) - step;
    const rush = Math.max(-1, Math.min(1, (velocity.get() - base) / 2600));
    return {
      transform: [
        { translateX: x },
        { rotateZ: `${-rush * 5 * tilt}deg` },
        { scale: 1 - Math.abs(rush) * 0.05 * tilt },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.slot, { width }, style]}
      // Copies exist only to fill the loop; screen readers get each item once.
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { overflow: 'hidden' },
  // A little room above and below so leaning items are not clipped.
  slot: { position: 'absolute', top: 8, bottom: 8, left: 0 },
});
