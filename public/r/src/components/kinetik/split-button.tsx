import { useEffect, useRef, useState } from 'react';
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
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type SplitButtonOption = {
  value: string;
  /** The button's label while this option is chosen, e.g. "Squash and merge". */
  label: string;
  /** A line under the label in the menu. */
  description?: string;
};

export type SplitButtonProps = {
  options: readonly SplitButtonOption[];
  /** The chosen option, which the main half runs. */
  value: string;
  onValueChange: (value: string) => void;
  /** Runs the chosen option. */
  onPress: (value: string) => void;
  /** Defaults to `ember`, the theme's strongest ink. */
  tone?: 'ember' | 'azure';
  /** Names the menu button. Defaults to 'More options'. */
  menuLabel?: string;
  /** A tick when the menu opens and on a new choice. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 48;
const CHEVRON_W = 48;
const PAD = 20;
const MENU_W = 280;

/**
 * A primary action with close alternatives behind a chevron. Picking one in
 * the menu makes it the button's action: the old label rolls up and away,
 * the new one rolls in, and the button springs to its width.
 */
export function SplitButton({
  options,
  value,
  onValueChange,
  onPress,
  tone = 'ember',
  menuLabel = 'More options',
  haptics = true,
  disabled = false,
  testID,
  style,
}: SplitButtonProps) {
  const { colors, font, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const window = useWindowDimensions();
  const ink = tone === 'azure' ? colors.azure : colors.ember;
  const onInk = tone === 'azure' ? colors.onAzure : colors.onEmber;
  const current = options.find((o) => o.value === value) ?? options[0]!;

  // Label widths, measured once off screen, so the button can spring between them.
  const [widths, setWidths] = useState<Record<string, number>>({});
  const width = useSharedValue(0);
  const [roll, setRoll] = useState({ from: current.label, to: current.label, id: 0 });
  if (roll.to !== current.label) setRoll({ from: roll.to, to: current.label, id: roll.id + 1 });
  const t = useSharedValue(1);

  useEffect(() => {
    const w = widths[current.value];
    if (w === undefined) return;
    const target = w + PAD * 2;
    width.set(width.get() === 0 || reduced ? target : withSpring(target, spring('smooth')));
  }, [widths, current.value, reduced, width]);

  useEffect(() => {
    if (roll.id === 0) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [roll.id, reduced, t]);

  // The menu.
  const anchor = useRef<View>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [open, setOpen] = useState(false);
  const m = useSharedValue(0);
  const openMenu = () => {
    setMenu(null);
    setOpen(true);
    haptic('tick');
    anchor.current?.measureInWindow((x, y, w, h) => setMenu({ x, y, w, h }));
  };
  useEffect(() => {
    if (!open || !menu) return;
    m.set(0);
    m.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [open, menu, reduced, m]);
  const closeMenu = (then?: () => void) => {
    const done = () => {
      setOpen(false);
      then?.();
    };
    if (reduced) {
      m.set(0);
      done();
      return;
    }
    m.set(
      withTiming(0, { duration: durations.quick, easing: easings.exit }, (finished) => {
        if (finished) scheduleOnRN(done);
      }),
    );
  };

  const main = useAnimatedStyle(() => (width.get() > 0 ? { width: width.get() } : {}));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [{ translateY: -t.get() * 16 }],
  }));
  const incoming = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * 16 }],
  }));
  const chevron = useAnimatedStyle(() => ({
    transform: [{ translateY: m.get() * 2 - 2 }, { rotate: `${45 + m.get() * 180}deg` }],
  }));
  const panel = useAnimatedStyle(() => ({
    opacity: Math.min(1, m.get() * 2),
    transform: [{ translateY: (1 - m.get()) * -8 }, { scale: 0.9 + m.get() * 0.1 }],
  }));

  const label = { color: onInk, fontSize: font.size.md, fontWeight: font.weight.semibold } as const;
  const menuLeft = menu
    ? Math.max(12, Math.min(window.width - MENU_W - 12, menu.x + menu.w - MENU_W))
    : 0;

  return (
    <View testID={testID} style={[styles.root, style]}>
      {/* Measures every label so widths are known before they are needed. */}
      <View
        style={styles.measure}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {options.map((o) => (
          <Text
            key={o.value}
            style={label}
            onLayout={(e) => {
              const w = Math.ceil(e.nativeEvent.layout.width);
              setWidths((prev) => (prev[o.value] === w ? prev : { ...prev, [o.value]: w }));
            }}
          >
            {o.label}
          </Text>
        ))}
      </View>

      <View
        ref={anchor}
        collapsable={false}
        style={[
          styles.pill,
          { backgroundColor: ink, borderRadius: radius.pill, opacity: disabled ? 0.45 : 1 },
        ]}
      >
        <Pressable
          disabled={disabled}
          onPress={() => onPress(current.value)}
          accessibilityRole="button"
          accessibilityLabel={current.label}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <Animated.View style={[styles.main, main]}>
            {roll.from !== roll.to ? (
              <Animated.View key={`o${roll.id}`} style={[styles.layer, outgoing]}>
                <Text numberOfLines={1} style={label}>
                  {roll.from}
                </Text>
              </Animated.View>
            ) : null}
            <Animated.View key={`i${roll.id}`} style={[styles.layer, incoming]}>
              <Text numberOfLines={1} style={label}>
                {roll.to}
              </Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: withAlpha(onInk, 0.25) }]} />
        <Pressable
          disabled={disabled}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={menuLabel}
          accessibilityState={{ expanded: open, disabled }}
          style={({ pressed }) => [styles.more, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Animated.View style={[styles.chevron, { borderColor: onInk }, chevron]} />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={StyleSheet.absoluteFill} onAccessibilityEscape={() => closeMenu()}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => closeMenu()}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
          <Animated.View
            style={[
              styles.panel,
              {
                left: menuLeft,
                top: menu ? menu.y + menu.h + 8 : 0,
                opacity: menu ? undefined : 0,
                width: MENU_W,
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radius.lg,
                boxShadow: shadow.lg,
                transformOrigin: 'right top',
              },
              panel,
            ]}
          >
            {options.map((o) => {
              const chosen = o.value === current.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() =>
                    closeMenu(() => {
                      if (chosen) return;
                      haptic('tick');
                      onValueChange(o.value);
                    })
                  }
                  accessibilityRole="menuitem"
                  accessibilityLabel={o.description ? `${o.label}, ${o.description}` : o.label}
                  accessibilityState={{ selected: chosen }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderRadius: radius.md,
                      backgroundColor: pressed ? colors.surfaceSunken : undefined,
                    },
                  ]}
                >
                  <View
                    style={[styles.check, { borderColor: chosen ? colors.azure : 'transparent' }]}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: font.size.md,
                        fontWeight: font.weight.medium,
                      }}
                    >
                      {o.label}
                    </Text>
                    {o.description ? (
                      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                        {o.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'flex-start' },
  // Wide enough that no label wraps while it is measured.
  measure: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    width: 1000,
    alignItems: 'flex-start',
  },
  pill: { flexDirection: 'row', alignItems: 'center', height: HEIGHT, overflow: 'hidden' },
  main: { height: HEIGHT, minWidth: 80, justifyContent: 'center' },
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  divider: { width: StyleSheet.hairlineWidth * 2, height: 22 },
  more: {
    width: CHEVRON_W,
    height: Math.max(HEIGHT, minTouchTarget),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { width: 8, height: 8, borderRightWidth: 2, borderBottomWidth: 2 },
  panel: { position: 'absolute', padding: 6, borderWidth: StyleSheet.hairlineWidth },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, minHeight: 52 },
  // A tick drawn from two borders, shown only beside the chosen option.
  check: {
    width: 7,
    height: 13,
    marginHorizontal: 4,
    marginTop: -4,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
