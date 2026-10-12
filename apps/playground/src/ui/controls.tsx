import type { Control, Controls } from '@kinetik/registry/demo-kit/types';
import { useHaptic } from '@kinetik/registry/shared/hooks/use-haptic';
import { useReduceMotion } from '@kinetik/registry/shared/hooks/use-reduce-motion';
import { spring } from '@kinetik/registry/shared/motion/motion';
import { useKinetikTheme } from '@kinetik/registry/shared/tokens/theme';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/* ----------------------------- Segmented control ----------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  renderLabel = (o) => o,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  renderLabel?: (option: T) => string;
}) {
  const { colors, radius, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.indexOf(value));
  const segment = width > 0 ? (width - 4) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withSpring(index * segment, spring('snappy', reduced)));
  }, [index, segment, reduced, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md }]}
    >
      {segment > 0 && (
        <Animated.View
          style={[
            styles.segmentIndicator,
            {
              width: segment,
              backgroundColor: colors.surfaceRaised,
              borderRadius: radius.md - 3,
              boxShadow: '0px 1px 3px rgba(0,0,0,0.18)',
            },
            indicator,
          ]}
        />
      )}
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) haptic('tick');
              onChange(option);
            }}
            style={styles.segment}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? colors.text : colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: selected ? font.weight.semibold : font.weight.medium,
              }}
            >
              {renderLabel(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------------- Switch ---------------------------------- */

export function Switch({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic();
  const t = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    t.set(withSpring(value ? 1 : 0, spring('snappy', reduced)));
  }, [value, reduced, t]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: t.get() * 18 }] }));

  return (
    // The whole row toggles, so the target is the full width and 44 pt tall.
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic('tap');
        onChange(!value);
      }}
      style={[styles.row, styles.switchRow]}
    >
      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
        {label}
      </Text>
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: value ? colors.ember : colors.track,
            borderColor: colors.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            { backgroundColor: value ? colors.onEmber : colors.textMuted },
            thumb,
          ]}
        />
      </View>
    </Pressable>
  );
}

/* ---------------------------------- Slider ---------------------------------- */

function SliderControl({
  min,
  max,
  step,
  value,
  onChange,
  label,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const { colors, radius } = useKinetikTheme();
  const haptic = useHaptic();
  const width = useSharedValue(0);
  const progress = useSharedValue((value - min) / (max - min));
  const last = useSharedValue(value);

  useEffect(() => {
    progress.set((value - min) / (max - min));
    last.set(value);
  }, [value, min, max, progress, last]);

  const commit = (v: number) => {
    haptic('tick');
    onChange(v);
  };

  const update = (x: number) => {
    'worklet';
    if (width.get() === 0) return;
    const p = Math.max(0, Math.min(1, x / width.get()));
    const stepped = Math.round((min + p * (max - min)) / step) * step;
    const clamped = Math.max(min, Math.min(max, Number(stepped.toFixed(4))));
    progress.set((clamped - min) / (max - min));
    if (clamped !== last.get()) {
      last.set(clamped);
      scheduleOnRN(commit, clamped);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-14, 14])
    .onBegin((e) => update(e.x))
    .onUpdate((e) => update(e.x));
  const tap = Gesture.Tap().onEnd((e) => update(e.x));

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * width.get() - 11 }],
  }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const next = e.nativeEvent.actionName === 'increment' ? value + step : value - step;
          onChange(Math.max(min, Math.min(max, Number(next.toFixed(4)))));
        }}
        onLayout={(e) => {
          width.set(e.nativeEvent.layout.width);
        }}
        style={styles.sliderHit}
      >
        <View
          style={[styles.sliderTrack, { backgroundColor: colors.track, borderRadius: radius.pill }]}
        >
          <Animated.View
            style={[
              styles.sliderFill,
              { backgroundColor: colors.ember, borderRadius: radius.pill },
              fill,
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.sliderThumb,
            {
              backgroundColor: colors.text,
              borderColor: colors.background,
              boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
            },
            thumb,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

/* ------------------------------- Control panel ------------------------------- */

function formatNumber(v: number, step: number) {
  const decimals = step >= 1 ? 0 : Math.min(3, String(step).split('.')[1]?.length ?? 2);
  return v.toFixed(decimals);
}

export function ControlRow({
  control,
  value,
  onChange,
}: {
  control: Control;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { colors, font, space } = useKinetikTheme();
  const labelStyle = { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium };

  if (control.type === 'boolean') {
    return <Switch value={Boolean(value)} onChange={onChange} label={control.label} />;
  }

  if (control.type === 'number') {
    const n = typeof value === 'number' ? value : control.default;
    return (
      <View style={{ gap: space[1] }}>
        <View style={styles.row}>
          <Text style={labelStyle}>{control.label}</Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.sm,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatNumber(n, control.step)}
          </Text>
        </View>
        <SliderControl
          label={control.label}
          min={control.min}
          max={control.max}
          step={control.step}
          value={n}
          onChange={onChange}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: space[2] }}>
      <Text style={labelStyle}>{control.label}</Text>
      <Segmented
        options={control.options}
        value={String(value)}
        onChange={onChange}
        label={control.label}
        renderLabel={(o) => o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g, ' ')}
      />
    </View>
  );
}

export function ControlPanel({
  controls,
  values,
  onChange,
}: {
  controls: Controls;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const { space } = useKinetikTheme();
  const entries = Object.entries(controls);
  if (entries.length === 0) return null;
  return (
    <View style={{ gap: space[5] }}>
      {entries.map(([key, control]) => (
        <ControlRow
          key={key}
          control={control}
          value={values[key]}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', padding: 2, height: 48 },
  segmentIndicator: { position: 'absolute', top: 2, bottom: 2, left: 2 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  switchTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  switchRow: { minHeight: 44 },
  switchThumb: { width: 22, height: 22, borderRadius: 11 },
  sliderHit: { height: 44, justifyContent: 'center' },
  sliderTrack: { height: 6, overflow: 'hidden' },
  sliderFill: { height: '100%' },
  sliderThumb: {
    position: 'absolute',
    left: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
