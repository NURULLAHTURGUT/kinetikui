import {
  Blur,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Paint,
  RoundedRect,
  rect,
  rrect,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type LiquidTab = { key: string; label: string };

export type LiquidTabsProps = {
  tabs: readonly LiquidTab[];
  /** Key of the selected tab. */
  value: string;
  onChange: (key: string) => void;
  /** Indicator colour. Defaults to the theme ember. */
  color?: string;
  /** Label colour on the indicator. Defaults to the theme onEmber. */
  activeTextColor?: string;
  /** A tick on change. Defaults to true. */
  haptics?: boolean;
  /** Accessible name of the tab list. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Each tab keeps a full 44 pt target inside the bar's padding.
const PAD = 4;
const HEIGHT = minTouchTarget + PAD * 2;

// Alpha threshold after a blur: shapes that overlap melt into one ("goo").
const GOO = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 20, -8];

/**
 * A segmented tab bar whose indicator flows like liquid: the leading edge
 * races ahead, the trailing edge catches up, the body thins as it stretches
 * and a droplet melts back into it on arrival.
 */
export function LiquidTabs({
  tabs,
  value,
  onChange,
  color,
  activeTextColor,
  haptics = true,
  accessibilityLabel,
  style,
}: LiquidTabsProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const goo = GOO_SUPPORTED && !reduced;
  const haptic = useHaptic(haptics);
  const fill = color ?? theme.colors.ember;
  const onFill = activeTextColor ?? theme.colors.onEmber;
  const [width, setWidth] = useState(0);
  const count = Math.max(1, tabs.length);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === value),
  );
  const segment = width > 0 ? (width - PAD * 2) / count : 0;

  const left = useSharedValue(index);
  const right = useSharedValue(index + 1);
  const drop = useSharedValue(index + 0.5);

  useEffect(() => {
    // Moving right, the right edge leads; moving left, the left edge leads.
    const forward = index >= left.get();
    const lead = spring('snappy', reduced);
    const trail = spring('smooth', reduced);
    left.set(withSpring(index, forward ? trail : lead));
    right.set(withSpring(index + 1, forward ? lead : trail));
    // The droplet leaves a beat late, so it trails the body and melts back in.
    drop.set(withDelay(reduced ? 0 : 70, withSpring(index + 0.5, trail)));
  }, [index, reduced, left, right, drop]);

  const body = useDerivedValue(() => {
    const x0 = PAD + left.get() * segment;
    const x1 = PAD + right.get() * segment;
    const w = Math.max(0, x1 - x0);
    // Conserve volume: the more it stretches, the thinner it gets.
    const stretch = segment > 0 ? Math.min(1, segment / Math.max(w, 1)) : 1;
    const h = (HEIGHT - PAD * 2) * (0.62 + 0.38 * stretch);
    const y = (HEIGHT - h) / 2;
    return rrect(rect(x0, y, w, h), h / 2, h / 2);
  });
  const dropX = useDerivedValue(() => PAD + drop.get() * segment);
  const dropR = useDerivedValue(() => {
    const centre = (left.get() + right.get()) / 2;
    // The droplet shows only while it lags behind the body.
    const lag = Math.abs(drop.get() - centre);
    return Math.min(1, lag * 2) * (HEIGHT - PAD * 2) * 0.3;
  });

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        { backgroundColor: theme.colors.track, borderRadius: theme.radius.pill },
        style,
      ]}
    >
      {segment > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group
            layer={
              <Paint>
                <Blur blur={goo ? 5 : 0} />
                <ColorMatrix matrix={goo ? GOO : IDENTITY} />
              </Paint>
            }
          >
            <RoundedRect rect={body} color={fill} />
            {goo && <Circle cx={dropX} cy={HEIGHT / 2} r={dropR} color={fill} />}
          </Group>
        </Canvas>
      )}
      {tabs.map((tab, i) => (
        <TabLabel
          key={tab.key}
          tab={tab}
          i={i}
          selected={i === index}
          left={left}
          right={right}
          inactive={theme.colors.textMuted}
          active={onFill}
          onPress={() => {
            if (tab.key === value) return;
            haptic('tick');
            onChange(tab.key);
          }}
        />
      ))}
    </View>
  );
}

// CanvasKit (web) renders the alpha-threshold layer fully transparent, so the
// web keeps the stretch but skips the goo filter and droplet.
const GOO_SUPPORTED = Platform.OS !== 'web';

const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

function TabLabel({
  tab,
  i,
  selected,
  left,
  right,
  inactive,
  active,
  onPress,
}: {
  tab: LiquidTab;
  i: number;
  selected: boolean;
  left: SharedValue<number>;
  right: SharedValue<number>;
  inactive: string;
  active: string;
  onPress: () => void;
}) {
  const { font } = useKinetikTheme();
  // Label colour follows how much of the tab the liquid currently covers.
  const textStyle = useAnimatedStyle(() => {
    const cover = Math.max(0, Math.min(i + 1, right.get()) - Math.max(i, left.get()));
    return { color: interpolateColor(Math.min(1, cover), [0, 1], [inactive, active]) };
  });
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.Text
        numberOfLines={1}
        style={[{ fontSize: font.size.sm, fontWeight: font.weight.semibold }, textStyle]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: HEIGHT, padding: PAD, minHeight: minTouchTarget },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
