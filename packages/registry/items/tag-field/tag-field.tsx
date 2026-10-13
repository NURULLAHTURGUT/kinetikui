import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring, springs, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type TagFieldProps = {
  value: readonly string[];
  onChange: (tags: string[]) => void;
  /** Shown above the field and used as the input's accessible name. */
  label: string;
  placeholder?: string;
  /** Characters that end a tag as they are typed. Return always does. Defaults to [","]. */
  separators?: readonly string[];
  /** No more tags can be added past this. */
  maxTags?: number;
  /** Return false to refuse a tag; the field shakes. */
  validate?: (tag: string) => boolean;
  /** Ticks as tags are added and removed. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const TAG_H = 32;

const enter = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.5 }] },
    animations: {
      opacity: withTiming(1, { duration: durations.quick }),
      transform: [{ scale: withSpring(1, springs.bouncy) }],
    },
  };
};
const leave = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: durations.quick, easing: easings.exit }),
      transform: [{ scale: withTiming(0.6, { duration: durations.quick, easing: easings.exit }) }],
    },
  };
};
const reflow = LinearTransition.springify()
  .mass(springs.smooth.mass)
  .stiffness(springs.smooth.stiffness)
  .damping(springs.smooth.damping);

/**
 * Typed words that turn into tags. A tag pops in when Return or a comma ends
 * it, the others make room on a spring, and Backspace in the empty field
 * marks the last tag before removing it. A duplicate makes the existing tag
 * jump instead of adding another.
 */
export function TagField({
  value,
  onChange,
  label,
  placeholder = 'Add a tag',
  separators = [','],
  maxTags,
  validate,
  haptics = true,
  testID,
  style,
}: TagFieldProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const input = useRef<TextInput>(null);
  const [draft, setDraft] = useState('');
  const [armed, setArmed] = useState(false);
  const [pulse, setPulse] = useState({ tag: '', n: 0 });
  const [focused, setFocused] = useState(false);
  const full = maxTags !== undefined && value.length >= maxTags;

  const shake = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.set(withTiming(focused ? 1 : 0, timing('quick', reduced)));
  }, [focused, reduced, ring]);

  const refuse = () => {
    haptic('warning');
    if (reduced) return;
    const step = { duration: 45, easing: easings.inOut };
    shake.set(
      withSequence(
        withTiming(-5, step),
        withTiming(5, step),
        withTiming(-3, step),
        withSpring(0, spring('snappy')),
      ),
    );
  };

  const add = (raw: string): boolean => {
    const tag = raw.trim();
    if (!tag) return true;
    const existing = value.find((t) => t.toLowerCase() === tag.toLowerCase());
    if (existing) {
      setPulse((p) => ({ tag: existing, n: p.n + 1 }));
      haptic('tick');
      return true;
    }
    if (full || (validate && !validate(tag))) {
      refuse();
      return false;
    }
    haptic('tick');
    onChange([...value, tag]);
    AccessibilityInfo.announceForAccessibility(`${tag} added`);
    return true;
  };

  const remove = (tag: string) => {
    haptic('tick');
    setArmed(false);
    onChange(value.filter((t) => t !== tag));
    AccessibilityInfo.announceForAccessibility(`${tag} removed`);
  };

  const type = (text: string) => {
    setArmed(false);
    const cut = separators.find((s) => s && text.includes(s));
    if (!cut) {
      setDraft(text);
      return;
    }
    const parts = text.split(cut);
    const rest = parts.pop() ?? '';
    const ok = parts.every((p) => add(p));
    setDraft(ok ? rest : text.replace(cut, ''));
  };

  const shell = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const outline = useAnimatedStyle(() => ({ opacity: ring.get() }));
  const last = value[value.length - 1];

  return (
    <View testID={testID} style={[{ gap: space[2] }, style]}>
      <View style={styles.header}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          {label}
        </Text>
        {maxTags !== undefined ? (
          <Text
            style={{
              color: full ? colors.warning : colors.textSubtle,
              fontSize: font.size.xs,
              fontVariant: ['tabular-nums'],
            }}
          >
            {value.length}/{maxTags}
          </Text>
        ) : null}
      </View>
      <Animated.View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            borderRadius: radius.md,
            padding: space[2],
          },
          shell,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderColor: colors.azure, borderRadius: radius.md + 1 }, outline]}
        />
        {value.map((tag) => (
          <Animated.View
            key={tag}
            entering={reduced ? undefined : enter}
            exiting={reduced ? undefined : leave}
            layout={reduced ? undefined : reflow}
            style={styles.slot}
          >
            <Tag
              tag={tag}
              armed={armed && tag === last}
              pulse={pulse.tag === tag ? pulse.n : 0}
              reduced={reduced}
              onRemove={() => remove(tag)}
            />
          </Animated.View>
        ))}
        <Animated.View layout={reduced ? undefined : reflow} style={styles.inputBox}>
          <TextInput
            ref={input}
            value={draft}
            onChangeText={type}
            onSubmitEditing={() => {
              if (add(draft)) setDraft('');
            }}
            submitBehavior="submit"
            onKeyPress={(e) => {
              if (e.nativeEvent.key !== 'Backspace' || draft.length > 0 || !last) return;
              if (armed) remove(last);
              else {
                haptic('tick');
                setArmed(true);
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setArmed(false);
            }}
            editable={!full}
            accessibilityLabel={label}
            accessibilityHint={
              value.length > 0 ? `${value.length} tags: ${value.join(', ')}` : undefined
            }
            placeholder={full ? `Up to ${maxTags}` : value.length > 0 ? '' : placeholder}
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.azure}
            cursorColor={colors.azure}
            returnKeyType="done"
            autoCapitalize="none"
            style={[styles.input, { color: colors.text, fontSize: font.size.md }]}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

type TagProps = {
  tag: string;
  armed: boolean;
  pulse: number;
  reduced: boolean;
  onRemove: () => void;
};

function Tag({ tag, armed, pulse, reduced, onRemove }: TagProps) {
  const { colors, font, radius } = useKinetikTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (pulse === 0 || reduced) return;
    scale.set(withSequence(withTiming(1.12, { duration: 90 }), withSpring(1, spring('bouncy'))));
  }, [pulse, reduced, scale]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    // The row is a full 44 pt tall so the remove button can be; the pill drawn
    // inside it is 32 pt.
    <Animated.View style={[styles.tag, motion]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: armed ? colors.azureSoft : colors.surfaceRaised,
            borderColor: armed ? colors.azure : colors.border,
            borderRadius: radius.pill,
          },
        ]}
      />
      <Text
        numberOfLines={1}
        style={[styles.tagText, { color: colors.text, fontSize: font.size.sm }]}
      >
        {tag}
      </Text>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${tag}`}
        style={styles.remove}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.cross,
              { backgroundColor: pressed ? colors.track : undefined, borderRadius: radius.pill },
            ]}
          >
            <View style={[styles.bar, { backgroundColor: colors.textMuted }, styles.barA]} />
            <View style={[styles.bar, { backgroundColor: colors.textMuted }, styles.barB]} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: {
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    minHeight: 52,
  },
  ring: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2 },
  // Each tag's slot is a full 44 pt tall (so its remove button is), but takes
  // only the pill's 32 pt of layout; the margins live on the outermost view so
  // nothing above clips the target.
  slot: { marginVertical: -(minTouchTarget - TAG_H) / 2 },
  tag: {
    height: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    maxWidth: 240,
  },
  pill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (minTouchTarget - TAG_H) / 2,
    bottom: (minTouchTarget - TAG_H) / 2,
    borderWidth: 1,
  },
  tagText: { flexShrink: 1 },
  remove: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', width: 10, height: 1.6, borderRadius: 1 },
  barA: { transform: [{ rotate: '45deg' }] },
  barB: { transform: [{ rotate: '-45deg' }] },
  inputBox: { flexGrow: 1, minWidth: 96, marginVertical: -(minTouchTarget - TAG_H - 4) / 2 },
  input: { minHeight: minTouchTarget, paddingVertical: 0, paddingHorizontal: 6 },
});
