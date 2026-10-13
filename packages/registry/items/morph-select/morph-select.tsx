import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type MorphSelectOption = {
  value: string;
  label: string;
  /** A second line in the list, e.g. a time zone offset. */
  description?: string;
  disabled?: boolean;
};

export type MorphSelectProps = {
  options: readonly MorphSelectOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  /** Shown above the trigger and used as its accessible name. */
  label: string;
  /** Shown in the trigger while nothing is chosen. Defaults to "Choose". */
  placeholder?: string;
  /** Rows shown before the list scrolls. Defaults to 6. */
  maxVisible?: number;
  /** A tick on open and on choosing. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const TRIGGER = 52;
const ROW = 48;
const PAD = 6;
const MARGIN = 12;

type Rect = { x: number; y: number; width: number; height: number };

/**
 * A select whose trigger grows into its list. The field stretches open in
 * place, the options slide in under it one after another, and a highlight
 * glides to the one you pick before the list folds back into the field.
 */
export function MorphSelect({
  options,
  value,
  onValueChange,
  label,
  placeholder = 'Choose',
  maxVisible = 6,
  haptics = true,
  testID,
  style,
}: MorphSelectProps) {
  const { colors, font, radius, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const window = useWindowDimensions();
  const trigger = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const t = useSharedValue(0);
  const index = options.findIndex((o) => o.value === value);
  const highlight = useSharedValue(Math.max(0, index));
  const selected = index >= 0 ? options[index] : undefined;

  const rows = Math.min(options.length, maxVisible);
  const listH = rows * ROW + PAD * 2;
  const rect = anchor ?? { x: MARGIN, y: 120, width: window.width - MARGIN * 2, height: TRIGGER };
  const room = window.height - (rect.y + rect.height) - MARGIN;
  const down = room >= listH || rect.y < window.height / 2;
  const fullH = rect.height + Math.min(listH, Math.max(ROW * 2, down ? room : rect.y - MARGIN));

  const open = () => {
    highlight.set(Math.max(0, index));
    setAnchor(null);
    setVisible(true);
    haptic('tick');
    trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };

  useEffect(() => {
    if (!visible || !anchor) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [visible, anchor, reduced, t]);

  const close = (chosen?: string) => {
    const done = () => {
      setVisible(false);
      if (chosen !== undefined) onValueChange(chosen);
    };
    if (reduced) {
      t.set(0);
      done();
      return;
    }
    // A chosen row holds its highlight for a beat before the list folds away.
    const wait = chosen === undefined ? 0 : 140;
    t.set(
      withDelay(
        wait,
        withTiming(0, { duration: durations.base, easing: easings.exit }, (finished) => {
          if (finished) scheduleOnRN(done);
        }),
      ),
    );
  };

  const choose = (i: number) => {
    const option = options[i];
    if (!option || option.disabled) return;
    haptic('tick');
    highlight.set(reduced ? i : withSpring(i, spring('snappy')));
    close(option.value);
  };

  const panel = useAnimatedStyle(() => {
    const h = interpolate(t.get(), [0, 1], [rect.height, fullH]);
    return {
      height: h,
      top: down ? rect.y : rect.y + rect.height - h,
      opacity: anchor ? 1 : 0,
    };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: t.get() * 0.6 }));
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${t.get() * 180}deg` }],
  }));
  const pill = useAnimatedStyle(() => ({ transform: [{ translateY: highlight.get() * ROW }] }));

  const shown = selected?.label ?? placeholder;
  const field = (
    <View style={[styles.fieldRow, { paddingHorizontal: space[4] }]}>
      <Text
        numberOfLines={1}
        style={[
          styles.grow,
          { color: selected ? colors.text : colors.textSubtle, fontSize: font.size.md },
        ]}
      >
        {shown}
      </Text>
      <Animated.View style={visible ? chevron : undefined}>
        <Chevron color={colors.textMuted} />
      </Animated.View>
    </View>
  );

  return (
    <View testID={testID} style={[{ gap: space[2] }, style]}>
      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
        {label}
      </Text>
      <Pressable
        ref={trigger}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        accessibilityState={{ expanded: visible }}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
            borderColor: colors.borderStrong,
            borderRadius: radius.md,
            opacity: visible && anchor ? 0 : 1,
          },
        ]}
      >
        {field}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => close()}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={StyleSheet.absoluteFill} onAccessibilityEscape={() => close()}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => close()}
              accessibilityRole="button"
              accessibilityLabel="Close list"
            />
          </Animated.View>
          <Animated.View
            accessibilityRole="list"
            style={[
              styles.panel,
              {
                left: rect.x,
                width: rect.width,
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.borderStrong,
                borderRadius: radius.md,
                boxShadow: shadow.lg,
                flexDirection: down ? 'column' : 'column-reverse',
              },
              panel,
            ]}
          >
            <Pressable
              onPress={() => close()}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${shown}`}
              accessibilityState={{ expanded: true }}
              style={styles.header}
            >
              {field}
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ScrollView
              style={styles.grow}
              contentContainerStyle={{ padding: PAD }}
              scrollEnabled={options.length > maxVisible}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pill,
                  { top: PAD, left: PAD, right: PAD, backgroundColor: colors.azureSoft },
                  { borderRadius: radius.sm, opacity: index >= 0 ? 1 : 0 },
                  pill,
                ]}
              />
              {options.map((option, i) => (
                <Row
                  key={option.value}
                  option={option}
                  index={i}
                  selected={i === index}
                  t={t}
                  onPress={() => choose(i)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

type RowProps = {
  option: MorphSelectOption;
  index: number;
  selected: boolean;
  t: SharedValue<number>;
  onPress: () => void;
};

function Row({ option, index, selected, t, onPress }: RowProps) {
  const { colors, font, space } = useKinetikTheme();
  // Rows arrive one after another as the panel opens.
  const motion = useAnimatedStyle(() => {
    const start = Math.min(0.5, 0.15 + index * 0.06);
    const p = interpolate(t.get(), [start, start + 0.45], [0, 1], 'clamp');
    return { opacity: p, transform: [{ translateY: (1 - p) * -8 }] };
  });
  return (
    <Animated.View style={motion}>
      <Pressable
        onPress={onPress}
        disabled={option.disabled}
        accessibilityRole="menuitem"
        accessibilityLabel={[option.label, option.description].filter(Boolean).join(', ')}
        accessibilityState={{ selected, disabled: option.disabled }}
        style={[styles.row, { paddingHorizontal: space[3], opacity: option.disabled ? 0.4 : 1 }]}
      >
        <View style={styles.grow}>
          <Text
            numberOfLines={1}
            style={{
              color: selected ? colors.azure : colors.text,
              fontSize: font.size.md,
              fontWeight: selected ? font.weight.semibold : font.weight.regular,
            }}
          >
            {option.label}
          </Text>
          {option.description ? (
            <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
              {option.description}
            </Text>
          ) : null}
        </View>
        {selected ? <Tick color={colors.azure} /> : null}
      </Pressable>
    </Animated.View>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      <View style={[styles.stroke, { backgroundColor: color }, styles.chevronL]} />
      <View style={[styles.stroke, { backgroundColor: color }, styles.chevronR]} />
    </View>
  );
}

function Tick({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      <View style={[styles.stroke, { backgroundColor: color }, styles.tickShort]} />
      <View style={[styles.stroke, { backgroundColor: color }, styles.tickLong]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { height: TRIGGER, borderWidth: 1, justifyContent: 'center' },
  header: { height: TRIGGER - 2, justifyContent: 'center' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: TRIGGER - 2 },
  grow: { flex: 1 },
  panel: { position: 'absolute', borderWidth: 1, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth },
  pill: { position: 'absolute', height: ROW },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  stroke: { position: 'absolute', height: 1.8, borderRadius: 1 },
  chevronL: { width: 7, left: 2.6, top: 8, transform: [{ rotate: '40deg' }] },
  chevronR: { width: 7, right: 2.6, top: 8, transform: [{ rotate: '-40deg' }] },
  tickShort: { width: 5.5, left: 2.2, top: 9, transform: [{ rotate: '45deg' }] },
  tickLong: { width: 10, left: 4.6, top: 7.4, transform: [{ rotate: '-50deg' }] },
});
