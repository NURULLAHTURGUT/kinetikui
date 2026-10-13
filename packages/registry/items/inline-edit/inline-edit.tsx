import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type InlineEditProps = {
  value: string;
  /** Called with the trimmed text when an edit is saved. Empty edits are dropped. */
  onSubmit: (value: string) => void;
  /** What the text is, for screen readers, e.g. "Project name". */
  accessibilityLabel: string;
  /** Shown while the text is empty. */
  placeholder?: string;
  /** Style for the text, shared by the label and the field so nothing moves. */
  textStyle?: StyleProp<TextStyle>;
  /** Defaults to 80. */
  maxLength?: number;
  /** A light tap when an edit is saved. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ICON = 16;
const PENCIL = Skia.Path.MakeFromSVGString(
  'M10.5 3.2l2.3 2.3M3 13l.6-2.9 7.6-7.6a1.2 1.2 0 0 1 1.7 0l.6.6a1.2 1.2 0 0 1 0 1.7l-7.6 7.6L3 13z',
)!;
const CHECK = Skia.Path.MakeFromSVGString('M3.2 8.4l3.1 3.1 6.5-6.9')!;
const CROSS = Skia.Path.MakeFromSVGString('M4 4l8 8M12 4l-8 8')!;

/**
 * Text you can rename where it stands. Tapping it turns the same line into a
 * field without moving a pixel, an underline draws in from the left and the
 * save and cancel buttons pop in beside it; saving puts the text back with a
 * brief check.
 */
export function InlineEdit({
  value,
  onSubmit,
  accessibilityLabel,
  placeholder = 'Untitled',
  textStyle,
  maxLength = 80,
  haptics = true,
  testID,
  style,
}: InlineEditProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(0);
  // Read in the blur handler: a blur after Save or Cancel must not save again.
  const mode = useRef<'idle' | 'editing'>('idle');

  const open = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    open.set(withSpring(editing ? 1 : 0, spring('snappy', reduced)));
  }, [editing, reduced, open]);

  useEffect(() => {
    if (saved === 0) return;
    flash.set(1);
    // A fade, not movement, so it plays with reduced motion too.
    flash.set(withDelay(900, withTiming(0, timing('slow'))));
    const id = setTimeout(() => setSaved(0), 900 + durations.slow);
    return () => clearTimeout(id);
  }, [saved, flash]);

  const start = () => {
    mode.current = 'editing';
    setDraft(value);
    setEditing(true);
  };
  const finish = (save: boolean) => {
    if (mode.current !== 'editing') return;
    mode.current = 'idle';
    setEditing(false);
    const next = draft.trim();
    if (!save || next.length === 0 || next === value) return;
    haptic('tap');
    onSubmit(next);
    setSaved((n) => n + 1);
  };

  const text = StyleSheet.flatten([
    {
      color: colors.text,
      fontSize: font.size.xl,
      fontWeight: font.weight.semibold,
      lineHeight: Math.round(font.size.xl * 1.3),
    },
    textStyle,
  ]);

  const underline = useAnimatedStyle(() => ({ transform: [{ scaleX: open.get() }] }));
  const actions = useAnimatedStyle(() => ({
    opacity: open.get(),
    transform: [{ scale: 0.6 + open.get() * 0.4 }],
  }));
  const pencil = useAnimatedStyle(() => ({ opacity: 1 - flash.get() }));
  const check = useAnimatedStyle(() => ({
    opacity: flash.get(),
    transform: [{ scale: 0.5 + flash.get() * 0.5 }],
  }));

  return (
    <View testID={testID} style={[styles.row, style]}>
      <View style={styles.grow}>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            selectTextOnFocus
            maxLength={maxLength}
            returnKeyType="done"
            onSubmitEditing={() => finish(true)}
            onBlur={() => finish(true)}
            accessibilityLabel={accessibilityLabel}
            placeholder={placeholder}
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.azure}
            cursorColor={colors.azure}
            style={[text, styles.input, { minHeight: minTouchTarget }]}
          />
        ) : (
          <Pressable
            onPress={start}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel}, ${value || placeholder}`}
            accessibilityHint="Edits the text"
            style={styles.label}
          >
            <Text
              numberOfLines={1}
              style={[text, styles.shrink, !value && { color: colors.textSubtle }]}
            >
              {value || placeholder}
            </Text>
            <View style={styles.badge}>
              <Animated.View style={[StyleSheet.absoluteFill, pencil]}>
                <Glyph path={PENCIL} color={colors.textSubtle} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, check]}>
                <Glyph path={CHECK} color={colors.success} width={2} />
              </Animated.View>
            </View>
          </Pressable>
        )}
        <Animated.View
          pointerEvents="none"
          style={[styles.underline, { backgroundColor: colors.azure }, underline]}
        />
      </View>
      {editing ? (
        <Animated.View style={[styles.actions, actions]}>
          <Pressable
            onPress={() => finish(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
            ]}
          >
            <Glyph path={CROSS} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => finish(true)}
            accessibilityRole="button"
            accessibilityLabel="Save"
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.azure, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Glyph path={CHECK} color={colors.onAzure} width={2} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Glyph({ path, color, width = 1.6 }: { path: SkPath; color: string; width?: number }) {
  return (
    <Canvas style={styles.glyph}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={width}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: minTouchTarget },
  grow: { flex: 1, justifyContent: 'center' },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: minTouchTarget,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  shrink: { flexShrink: 1 },
  input: { padding: 0, margin: 0, includeFontPadding: false },
  badge: { width: ICON, height: ICON },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    height: 2,
    borderRadius: 1,
    transformOrigin: 'left center',
  },
  actions: { flexDirection: 'row', gap: 6 },
  action: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { width: ICON, height: ICON },
});
