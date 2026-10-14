import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { glow, minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type Topic = {
  id: string;
  label: string;
  /** An emoji or short glyph before the label. */
  emoji?: string;
};

export type TopicPickerProps = {
  topics: readonly Topic[];
  /** Ids of the picked topics. */
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  title?: string;
  subtitle?: string;
  /** Rows of drifting chips. Topics are dealt across them in turn. Defaults to 3. */
  rows?: number;
  /** Drift speed in pt per second. Defaults to 22. */
  speed?: number;
  /** The button under the rows. Disabled until `minimum` topics are picked. */
  submit?: { label: string; onPress: (selected: string[]) => void };
  /** Defaults to 1. */
  minimum?: number;
  /** A tick on each pick. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Topic chips drifting past in rows that run in opposite directions, fading
 * out at the edges. Picking one pops it and washes it in a soft colour; the
 * button underneath wakes up once enough are picked.
 */
export function TopicPicker({
  topics,
  selected,
  onChange,
  title = 'Select your topics',
  subtitle = 'Choose topics that you are interested in',
  rows = 3,
  speed = 22,
  submit,
  minimum = 1,
  haptics = true,
  style,
}: TopicPickerProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const lines = Array.from({ length: rows }, (_, r) => topics.filter((_, i) => i % rows === r));
  const tints = [colors.azure, colors.warning, colors.danger, colors.success, colors.sky];
  const ready = selected.length >= minimum;

  const toggle = (id: string) => {
    haptic('tick');
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const fade = withAlpha(colors.surfaceRaised, 0);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.xl + 8,
          paddingVertical: space[6],
          gap: space[6],
          boxShadow: shadow.lg,
        },
        style,
      ]}
    >
      <View style={{ alignItems: 'center', gap: space[1], paddingHorizontal: space[5] }}>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: font.size['2xl'],
            fontWeight: font.weight.bold,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md, textAlign: 'center' }}>
          {subtitle}
        </Text>
      </View>

      <View style={{ gap: space[3] }}>
        {lines.map((line, r) => (
          <Row
            key={r}
            topics={line}
            direction={r % 2 === 0 ? 'left' : 'right'}
            speed={speed * (1 + r * 0.18)}
            still={reduced}
            selected={selected}
            tintFor={(id) => tints[topics.findIndex((t) => t.id === id) % tints.length]!}
            onToggle={toggle}
          />
        ))}
        <View
          pointerEvents="none"
          style={[
            styles.edge,
            styles.edgeLeft,
            gradient(`linear-gradient(90deg, ${colors.surfaceRaised} 0%, ${fade} 100%)`),
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.edge,
            styles.edgeRight,
            gradient(`linear-gradient(270deg, ${colors.surfaceRaised} 0%, ${fade} 100%)`),
          ]}
        />
      </View>

      {submit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          accessibilityHint={`${selected.length} selected`}
          disabled={!ready}
          onPress={() => submit.onPress([...selected])}
          style={({ pressed }) => [
            styles.submit,
            {
              marginHorizontal: space[5],
              borderRadius: radius.pill,
              backgroundColor: ready ? colors.azureSoft : colors.surfaceSunken,
              boxShadow: ready ? glow(colors.azure) : undefined,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text
            style={{
              color: ready ? colors.text : colors.textSubtle,
              fontSize: font.size.md,
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.wide,
            }}
          >
            {submit.label.toUpperCase()}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({
  topics,
  direction,
  speed,
  still,
  selected,
  tintFor,
  onToggle,
}: {
  topics: readonly Topic[];
  direction: 'left' | 'right';
  speed: number;
  still: boolean;
  selected: readonly string[];
  tintFor: (id: string) => string;
  onToggle: (id: string) => void;
}) {
  const [span, setSpan] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (still || span <= 0) return;
    const from = direction === 'left' ? 0 : -span;
    const to = direction === 'left' ? -span : 0;
    x.set(from);
    x.set(
      withRepeat(withTiming(to, { duration: (span / speed) * 1000, easing: Easing.linear }), -1),
    );
  }, [span, speed, direction, still, x]);

  const drift = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const chips = (copy: number) => (
    <View
      style={styles.copy}
      onLayout={copy === 0 ? (e) => setSpan(e.nativeEvent.layout.width) : undefined}
      accessibilityElementsHidden={copy === 1}
      importantForAccessibility={copy === 1 ? 'no-hide-descendants' : 'auto'}
    >
      {topics.map((t) => (
        <Chip
          key={t.id}
          topic={t}
          on={selected.includes(t.id)}
          tint={tintFor(t.id)}
          onPress={() => onToggle(t.id)}
        />
      ))}
    </View>
  );

  // With reduced motion the row holds still and scrolls by hand instead.
  if (still) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {chips(0)}
      </ScrollView>
    );
  }
  return (
    <View style={styles.rowClip}>
      <Animated.View style={[styles.track, drift]}>
        {chips(0)}
        {chips(1)}
      </Animated.View>
    </View>
  );
}

function Chip({
  topic,
  on,
  tint,
  onPress,
}: {
  topic: Topic;
  on: boolean;
  tint: string;
  onPress: () => void;
}) {
  const { colors, radius, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pop = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.get() * 0.1 }] }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={topic.label}
      accessibilityState={{ checked: on }}
      onPress={() => {
        if (!reduced) {
          pop.set(withSequence(withTiming(1, timing('quick')), withSpring(0, spring('bouncy'))));
        }
        onPress();
      }}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            borderRadius: radius.pill,
            backgroundColor: on ? withAlpha(tint, 0.28) : colors.surface,
            // No shadow: dozens of chips move every frame, and a border is far cheaper.
            borderColor: on ? withAlpha(tint, 0.6) : colors.borderStrong,
          },
          style,
        ]}
      >
        {topic.emoji ? <Text style={{ fontSize: font.size.lg }}>{topic.emoji}</Text> : null}
        <Text
          style={{ color: colors.text, fontSize: font.size.md + 1, fontWeight: font.weight.medium }}
        >
          {topic.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'hidden' },
  rowClip: { overflow: 'hidden', paddingVertical: 4 },
  track: { flexDirection: 'row', alignSelf: 'flex-start' },
  copy: { flexDirection: 'row', gap: 10, paddingRight: 10 },
  scroll: { paddingHorizontal: 16, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: minTouchTarget + 4,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  edge: { position: 'absolute', top: 0, bottom: 0, width: 40 },
  edgeLeft: { left: 0 },
  edgeRight: { right: 0 },
  submit: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
});
