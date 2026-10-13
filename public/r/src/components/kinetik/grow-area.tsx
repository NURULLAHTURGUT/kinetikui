import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type GrowAreaProps = Omit<
  TextInputProps,
  'style' | 'multiline' | 'value' | 'onChangeText' | 'maxLength'
> & {
  /** Shown above the field and used as its accessible name. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** A hard limit. A ring fills towards it and the count of characters left appears near the end. */
  maxLength?: number;
  /** Height when empty, in lines. Defaults to 3. */
  minLines?: number;
  /** The field stops growing and scrolls past this many lines. Defaults to 8. */
  maxLines?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const LINE = 22;
const PAD = 12;
const RING = 22;
const STROKE = 2.5;
/** The count of characters left shows once this few remain. */
const NEAR = 20;

const arc = (() => {
  const r = RING / 2 - STROKE;
  return Skia.PathBuilder.Make()
    .addArc({ x: RING / 2 - r, y: RING / 2 - r, width: r * 2, height: r * 2 }, -90, 359.99)
    .detach();
})();

/**
 * A multi-line field that grows with what is typed. The height springs a line
 * at a time up to a limit, then the text scrolls; a ring beside the label
 * fills towards the character limit and turns amber, then red, near the end.
 */
export function GrowArea({
  label,
  value,
  onChangeText,
  maxLength,
  minLines = 3,
  maxLines = 8,
  editable = true,
  onFocus,
  onBlur,
  testID,
  style,
  ...input
}: GrowAreaProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [focused, setFocused] = useState(false);
  const [content, setContent] = useState(0);

  const lo = minLines * LINE;
  const hi = Math.max(lo, maxLines * LINE);
  const target = Math.min(hi, Math.max(lo, content)) + PAD * 2;

  const height = useSharedValue(target);
  const ring = useSharedValue(0);
  useEffect(() => {
    height.set(withSpring(target, spring('smooth', reduced)));
  }, [target, reduced, height]);
  useEffect(() => {
    ring.set(withTiming(focused ? 1 : 0, timing('quick', reduced)));
  }, [focused, reduced, ring]);

  const used = maxLength ? Math.min(1, value.length / maxLength) : 0;
  const fill = useSharedValue(used);
  useEffect(() => {
    fill.set(withSpring(used, spring('snappy', reduced)));
  }, [used, reduced, fill]);

  const left = maxLength ? maxLength - value.length : 0;
  const tone = !maxLength
    ? colors.azure
    : left <= 0
      ? colors.danger
      : left <= NEAR
        ? colors.warning
        : colors.azure;

  const box = useAnimatedStyle(() => ({ height: height.get() }));
  const outline = useAnimatedStyle(() => ({ opacity: ring.get() }));

  return (
    <View testID={testID} style={[{ gap: space[2], opacity: editable ? 1 : 0.5 }, style]}>
      <View style={styles.header}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          {label}
        </Text>
        {maxLength ? (
          <View
            style={styles.counter}
            accessible
            accessibilityLabel={`${Math.max(0, left)} characters left`}
          >
            {left <= NEAR ? (
              <Text
                style={{
                  color: tone,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {left}
              </Text>
            ) : null}
            <Canvas style={styles.ring}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING / 2 - STROKE}
                style="stroke"
                strokeWidth={STROKE}
                color={colors.track}
              />
              <Path
                path={arc}
                style="stroke"
                strokeWidth={STROKE}
                strokeCap="round"
                color={tone}
                end={fill}
              />
            </Canvas>
          </View>
        ) : null}
      </View>
      <Animated.View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            borderRadius: radius.md,
            paddingHorizontal: space[4],
          },
          box,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.focusRing,
            { borderColor: colors.azure, borderRadius: radius.md + 1 },
            outline,
          ]}
        />
        <TextInput
          {...input}
          multiline
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          editable={editable}
          scrollEnabled={content > hi}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onContentSizeChange={(e) => setContent(Math.ceil(e.nativeEvent.contentSize.height))}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.azure}
          cursorColor={colors.azure}
          textAlignVertical="top"
          style={[styles.input, { color: colors.text, fontSize: font.size.md, lineHeight: LINE }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: RING,
  },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ring: { width: RING, height: RING },
  field: { borderWidth: 1, paddingVertical: PAD - 1, overflow: 'hidden' },
  focusRing: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2 },
  input: { flex: 1, padding: 0, margin: 0 },
});
