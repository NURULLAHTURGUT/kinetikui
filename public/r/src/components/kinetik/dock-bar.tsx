import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type DockItem = {
  key: string;
  label: string;
  /** Icon drawn inside the item; receive the active state to style it. */
  icon: (state: { active: boolean; color: string }) => ReactNode;
};

export type DockBarProps = {
  items: readonly DockItem[];
  /** Key of the active item. */
  value: string;
  onChange: (key: string) => void;
  /** Size of the item under the finger relative to rest. Defaults to 1.6. */
  magnification?: number;
  /** Item size at rest, in pt. Defaults to 48. */
  itemSize?: number;
  /** Ticks as the finger crosses items. Defaults to true. */
  haptics?: boolean;
  /** Accessible name of the bar. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const GAP = 6;
const TOOLTIP_WIDTH = 160;

/**
 * A floating bottom navigation bar that swells under the finger like a dock.
 * Slide along it to preview items, release to choose; a tap chooses directly.
 */
export function DockBar({
  items,
  value,
  onChange,
  magnification = 1.6,
  itemSize = 48,
  haptics = true,
  accessibilityLabel,
  style,
}: DockBarProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const mag = reduced ? 1 : Math.max(1, Math.min(2.2, magnification));
  const pad = theme.space[2];
  const dark = theme.scheme === 'dark';

  const finger = useSharedValue(-1000);
  const touching = useSharedValue(0);
  const hovered = useSharedValue(-1);
  const [preview, setPreview] = useState<number | null>(null);

  const step = itemSize + GAP;
  const indexAt = (x: number) => {
    'worklet';
    const i = Math.floor((x - pad + GAP / 2) / step);
    return Math.max(0, Math.min(items.length - 1, i));
  };

  const choose = (i: number) => {
    const item = items[i];
    setPreview(null);
    if (item && item.key !== value) onChange(item.key);
  };
  const show = (i: number) => {
    setPreview(i < 0 ? null : i);
    if (i >= 0) haptic('tick');
  };

  // Tick and show the label whenever the finger moves onto a new item.
  useAnimatedReaction(
    () => (touching.get() > 0.5 ? indexAt(finger.get()) : -1),
    (i, prev) => {
      if (i !== prev) {
        hovered.set(i);
        scheduleOnRN(show, i);
      }
    },
  );

  const pan = Gesture.Pan()
    .withTestId('dock-bar')
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      finger.set(e.x);
      touching.set(withSpring(1, spring('snappy', reduced)));
    })
    .onUpdate((e) => {
      finger.set(e.x);
    })
    .onEnd((e) => {
      scheduleOnRN(choose, indexAt(e.x));
    })
    .onFinalize(() => {
      touching.set(withSpring(0, spring('smooth', reduced)));
      hovered.set(-1);
      scheduleOnRN(show, -1);
    });

  // The bar's backdrop widens as the outer items are pushed out, so they never
  // hang over its edge. Only a transform: no layout work per frame.
  const barWidth = pad * 2 + items.length * itemSize + (items.length - 1) * GAP;
  const spread = (mag - 1) * itemSize * 0.75 * 2;
  const backdrop = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + (spread / barWidth) * touching.get() }],
  }));

  const activeIndex = items.findIndex((i) => i.key === value);
  const previewItem = preview === null ? null : items[preview];

  return (
    <View style={[styles.wrap, style]}>
      {previewItem ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: pad + (preview ?? 0) * step + itemSize / 2 - TOOLTIP_WIDTH / 2,
              bottom: itemSize * mag + pad * 2 + 4,
            },
          ]}
        >
          <View
            style={[
              styles.tooltipInner,
              {
                backgroundColor: theme.colors.text,
                borderRadius: theme.radius.xs,
                boxShadow: theme.shadow.md,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.background,
                fontSize: theme.font.size.xs,
                fontWeight: theme.font.weight.semibold,
              }}
            >
              {previewItem.label}
            </Text>
          </View>
          <View style={[styles.caret, { backgroundColor: theme.colors.text }]} />
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          accessibilityRole="tablist"
          accessibilityLabel={accessibilityLabel}
          style={[styles.bar, { padding: pad, gap: GAP }]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              {
                borderRadius: itemSize / 2 + pad,
                backgroundColor: withAlpha(theme.colors.surfaceRaised, dark ? 0.78 : 0.86),
                borderColor: theme.colors.borderStrong,
                // A soft drop shadow and a fine highlight along the top edge, like glass.
                boxShadow: `${theme.shadow.lg}, inset 0px 1px 0px ${withAlpha(theme.colors.highlight, dark ? 0.1 : 0.9)}`,
              },
              backdrop,
            ]}
          />
          {items.map((item, i) => (
            <DockSlot
              key={item.key}
              item={item}
              i={i}
              active={i === activeIndex}
              size={itemSize}
              step={step}
              pad={pad}
              mag={mag}
              finger={finger}
              touching={touching}
              onActivate={() => choose(i)}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

function DockSlot({
  item,
  i,
  active,
  size,
  step,
  pad,
  mag,
  finger,
  touching,
  onActivate,
}: {
  item: DockItem;
  i: number;
  active: boolean;
  size: number;
  step: number;
  pad: number;
  mag: number;
  finger: SharedValue<number>;
  touching: SharedValue<number>;
  onActivate: () => void;
}) {
  const { colors, scheme } = useKinetikTheme();
  const dark = scheme === 'dark';
  const center = pad + i * step + size / 2;

  // Gaussian falloff around the finger; items grow upward from the bar.
  const animated = useAnimatedStyle(() => {
    const d = (finger.get() - center) / (size * 1.25);
    const s = 1 + (mag - 1) * Math.exp(-d * d) * touching.get();
    // Neighbours make room: items shift away from the finger as they grow.
    const push = -Math.tanh(d) * (mag - 1) * size * 0.75 * touching.get();
    return {
      transform: [{ translateX: push }, { translateY: (-(s - 1) * size) / 2 }, { scale: s }],
    };
  });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate') onActivate();
  };

  const tint = active ? colors.onEmber : colors.textMuted;
  // Tiles are lit from above: a lighter top fading down, and a bright rim.
  const tile = active
    ? { backgroundColor: colors.ember, borderColor: colors.ember }
    : {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        ...gradient(
          `linear-gradient(180deg, ${withAlpha(colors.highlight, dark ? 0.09 : 1)} 0%, ${withAlpha(colors.highlight, dark ? 0.02 : 0.4)} 100%)`,
        ),
      };

  return (
    <Animated.View
      accessible
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.item,
          tile,
          {
            width: size,
            height: size,
            // Continuous-looking corners: about 30% of the side, as on app icons.
            borderRadius: size * 0.3,
            boxShadow: active
              ? `0px 4px 14px ${withAlpha(colors.ember, dark ? 0.25 : 0.3)}`
              : `inset 0px 1px 0px ${withAlpha(colors.highlight, dark ? 0.08 : 1)}`,
          },
          animated,
        ]}
      >
        {item.icon({ active, color: tint })}
      </Animated.View>
      <View style={[styles.dot, { backgroundColor: active ? colors.text : 'transparent' }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  bar: { flexDirection: 'row', alignItems: 'flex-end', minHeight: minTouchTarget },
  backdrop: { ...StyleSheet.absoluteFill, borderWidth: StyleSheet.hairlineWidth },
  item: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  dot: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  tooltip: { position: 'absolute', width: TOOLTIP_WIDTH, alignItems: 'center' },
  tooltipInner: { paddingHorizontal: 10, paddingVertical: 5 },
  caret: { width: 8, height: 8, marginTop: -5, transform: [{ rotate: '45deg' }], zIndex: -1 },
});
