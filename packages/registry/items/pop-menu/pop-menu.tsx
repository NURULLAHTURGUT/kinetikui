import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type PopMenuItem = {
  key: string;
  label: string;
  /** Drawn before the label; receives the colour to use. */
  icon?: (color: string) => ReactNode;
  /** Red, for actions that remove or leave. */
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export type PopMenuProps = {
  items: readonly PopMenuItem[];
  /** The trigger's content, e.g. a "more" icon. */
  children: ReactNode;
  /** Names the trigger, e.g. "More actions". */
  accessibilityLabel: string;
  /** Which edge of the trigger the menu lines up with. Defaults to `end`. */
  align?: 'start' | 'end';
  /** Menu width. Defaults to 220. */
  width?: number;
  /** A tick on open. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  /** Style for the trigger. */
  style?: StyleProp<ViewStyle>;
};

type Anchor = { x: number; y: number; width: number; height: number };

const ROW = 46;
const MARGIN = 12;

/**
 * A menu that unfolds from its trigger. The panel grows out of the trigger's
 * corner, the rows slide in one after another, and a highlight follows the
 * finger down the list before the chosen action runs.
 */
export function PopMenu({
  items,
  children,
  accessibilityLabel,
  align = 'end',
  width = 220,
  haptics = true,
  testID,
  style,
}: PopMenuProps) {
  const { colors, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const window = useWindowDimensions();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [visible, setVisible] = useState(false);
  const t = useSharedValue(0);
  const hover = useSharedValue(-1);

  const height = items.length * ROW + 12;
  const below = anchor ? anchor.y + anchor.height + 6 + height < window.height - MARGIN : true;
  const left = anchor
    ? Math.max(
        MARGIN,
        Math.min(
          window.width - width - MARGIN,
          align === 'end' ? anchor.x + anchor.width - width : anchor.x,
        ),
      )
    : 0;
  const top = anchor ? (below ? anchor.y + anchor.height + 6 : anchor.y - height - 6) : 0;

  const open = () => {
    hover.set(-1);
    setAnchor(null);
    setVisible(true);
    haptic('tick');
    // The panel stays invisible until the trigger has been measured, then grows from it.
    trigger.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, width: w, height: h }));
  };

  useEffect(() => {
    if (!visible || !anchor) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [visible, anchor, reduced, t]);

  const close = (then?: () => void) => {
    const done = () => {
      setVisible(false);
      then?.();
    };
    if (reduced) {
      t.set(0);
      done();
      return;
    }
    t.set(
      withTiming(0, { duration: durations.quick, easing: easings.exit }, (finished) => {
        if (finished) scheduleOnRN(done);
      }),
    );
  };

  const panel = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.get() * 2),
    transform: [{ scale: 0.82 + t.get() * 0.18 }],
  }));

  const originX = anchor ? Math.max(0, Math.min(width, anchor.x + anchor.width / 2 - left)) : width;

  return (
    <>
      <Pressable
        ref={trigger}
        testID={testID}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: visible }}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.surfaceSunken : undefined,
          },
          style,
        ]}
      >
        {children}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => close()}
        statusBarTranslucent
        navigationBarTranslucent
      >
        {/* The modal is its own window, so focus stays inside; escape closes it. */}
        <View style={StyleSheet.absoluteFill} onAccessibilityEscape={() => close()}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => close()}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
          <Animated.View
            style={[
              styles.panel,
              {
                left,
                top,
                width,
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radius.lg,
                boxShadow: shadow.lg,
                transformOrigin: `${originX}px ${below ? '0%' : '100%'}`,
              },
              panel,
            ]}
          >
            {items.map((item, i) => (
              <Row
                key={item.key}
                item={item}
                index={i}
                count={items.length}
                t={t}
                hover={hover}
                onSelect={() => close(item.onPress)}
              />
            ))}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

type RowProps = {
  item: PopMenuItem;
  index: number;
  count: number;
  t: SharedValue<number>;
  hover: SharedValue<number>;
  onSelect: () => void;
};

function Row({ item, index, count, t, hover, onSelect }: RowProps) {
  const { colors, font, radius } = useKinetikTheme();
  const ink = item.destructive ? colors.danger : colors.text;

  const row = useAnimatedStyle(() => {
    // Rows arrive one after another as the panel opens.
    const start = (index / Math.max(1, count)) * 0.45;
    const p = Math.max(0, Math.min(1, (t.get() - start) / 0.55));
    return { opacity: p, transform: [{ translateY: (1 - p) * -8 }] };
  });
  const highlight = useAnimatedStyle(() => ({ opacity: hover.get() === index ? 1 : 0 }));

  return (
    <Animated.View style={row}>
      <Pressable
        disabled={item.disabled}
        onPressIn={() => hover.set(index)}
        onPressOut={() => hover.set(-1)}
        onPress={onSelect}
        accessibilityRole="menuitem"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: item.disabled }}
        style={[styles.row, { opacity: item.disabled ? 0.4 : 1 }]}
      >
        <Animated.View
          style={[
            styles.highlight,
            { backgroundColor: withAlpha(ink, 0.08), borderRadius: radius.sm },
            highlight,
          ]}
        />
        {item.icon ? <View style={styles.icon}>{item.icon(ink)}</View> : null}
        <Text style={{ color: ink, fontSize: font.size.md, fontWeight: font.weight.medium }}>
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: { position: 'absolute', padding: 6, borderWidth: StyleSheet.hairlineWidth },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  // A faint wash of the row's own ink, so destructive rows highlight in red.
  highlight: { ...StyleSheet.absoluteFill },
  icon: { width: 20, alignItems: 'center' },
});
