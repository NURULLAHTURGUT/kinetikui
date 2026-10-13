import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type SearchMorphProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** Called from the keyboard's search key. */
  onSubmit?: (value: string) => void;
  /** Defaults to 'Search'. Also names the button and the field. */
  placeholder?: string;
  /** Controlled open state. Leave unset to let the component keep its own. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Defaults to 'Cancel'. */
  cancelLabel?: string;
  /** Shown under the field while it is open, e.g. results or recent searches. */
  children?: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** A little over the 44 pt minimum, so pixel rounding never takes it below. */
const SIZE = 48;
const GAP = 12;

/**
 * A search button that grows into a search field. The circle stretches
 * across the bar with the glass riding its left edge, Cancel slides in beside
 * it, and whatever you pass as children rises in underneath.
 */
export function SearchMorph({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search',
  open,
  defaultOpen = false,
  onOpenChange,
  cancelLabel = 'Cancel',
  children,
  testID,
  style,
}: SearchMorphProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const [width, setWidth] = useState(0);
  const [cancelW, setCancelW] = useState(0);
  const input = useRef<TextInput>(null);

  const t = useSharedValue(isOpen ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(isOpen ? 1 : 0, spring('smooth', reduced)));
    if (isOpen) {
      // Focus once the field has started to open, so the keyboard does not race the morph.
      const id = setTimeout(() => input.current?.focus(), reduced ? 0 : 120);
      return () => clearTimeout(id);
    }
    input.current?.blur();
  }, [isOpen, reduced, t]);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const cancel = () => {
    onChangeText('');
    setOpen(false);
  };

  const shell = useAnimatedStyle(() => {
    const p = t.get();
    return {
      // Hidden until the bar is measured, so it never flashes at full width.
      opacity: width === 0 ? 0 : 1,
      left: Math.max(0, (width - SIZE) * (1 - p)),
      right: (cancelW + GAP) * Math.max(0, p),
      backgroundColor: interpolateColor(p, [0, 1], [colors.surfaceRaised, colors.surface]),
      borderColor: interpolateColor(p, [0, 1], [colors.border, colors.borderStrong]),
    };
  });
  const field = useAnimatedStyle(() => ({ opacity: Math.max(0, t.get() * 1.6 - 0.6) }));
  const cancelStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, t.get() * 2 - 1),
    transform: [{ translateX: (1 - t.get()) * 24 }],
  }));
  const below = useAnimatedStyle(() => ({
    opacity: Math.max(0, t.get() * 2 - 1),
    transform: [{ translateY: (1 - t.get()) * -12 }],
  }));

  return (
    <View testID={testID} style={style}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.shell, { borderRadius: radius.pill }, shell]}>
          <View style={styles.glass} pointerEvents="none">
            <View style={[styles.lens, { borderColor: colors.text }]} />
            <View style={[styles.handle, { backgroundColor: colors.text }]} />
          </View>
          <Animated.View
            style={[styles.field, field]}
            pointerEvents={isOpen ? 'auto' : 'none'}
            accessibilityElementsHidden={!isOpen}
            importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
          >
            <TextInput
              ref={input}
              value={value}
              onChangeText={onChangeText}
              onSubmitEditing={() => onSubmit?.(value)}
              placeholder={placeholder}
              placeholderTextColor={colors.textSubtle}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={placeholder}
              selectionColor={colors.azure}
              style={[styles.input, { color: colors.text, fontSize: font.size.md }]}
            />
            {value ? (
              <Pressable
                onPress={() => {
                  onChangeText('');
                  input.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={styles.clear}
              >
                <View style={[styles.clearDot, { backgroundColor: colors.textSubtle }]}>
                  <View style={[styles.cross, { backgroundColor: colors.surface }]} />
                  <View
                    style={[styles.cross, styles.crossTurn, { backgroundColor: colors.surface }]}
                  />
                </View>
              </Pressable>
            ) : null}
          </Animated.View>
          {!isOpen ? (
            <Pressable
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={placeholder}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>

        <Animated.View
          style={[styles.cancel, cancelStyle]}
          pointerEvents={isOpen ? 'auto' : 'none'}
          accessibilityElementsHidden={!isOpen}
          importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        >
          <Pressable
            onPress={cancel}
            accessibilityRole="button"
            onLayout={(e) => setCancelW(e.nativeEvent.layout.width)}
            style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text
              style={{
                color: colors.azure,
                fontSize: font.size.md,
                fontWeight: font.weight.medium,
              }}
            >
              {cancelLabel}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {children && isOpen ? (
        <Animated.View style={[{ marginTop: space[3] }, below]}>{children}</Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: SIZE, justifyContent: 'center' },
  shell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  // The glass sits in the first 44 pt, so it reads the same closed and open.
  glass: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  lens: {
    position: 'absolute',
    left: 16,
    top: 15,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  handle: {
    position: 'absolute',
    left: 26,
    top: 27.5,
    width: 7,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  field: {
    position: 'absolute',
    left: SIZE - 4,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, height: SIZE, paddingVertical: 0 },
  clear: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  clearDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { position: 'absolute', width: 9, height: 1.5, transform: [{ rotate: '45deg' }] },
  crossTurn: { transform: [{ rotate: '-45deg' }] },
  cancel: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  cancelButton: { minHeight: SIZE, justifyContent: 'center' },
});
