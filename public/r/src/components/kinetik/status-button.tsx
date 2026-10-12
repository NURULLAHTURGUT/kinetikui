import { Canvas, Group, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

export type StatusButtonProps = {
  /** Label while idle. */
  children: string;
  /** Drives the button. Set `loading` while work runs, then `success` or `error`. */
  status: ButtonStatus;
  onPress?: () => void;
  /** Label once it worked. Defaults to 'Done'. */
  successLabel?: string;
  /** Label when it failed. Defaults to 'Try again'. */
  errorLabel?: string;
  /** Haptics on success and error. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 52;
const ICON = 20;
const PAD = 26;

// A check and a cross on a 20 pt grid, drawn as paths so they can be traced in.
const CHECK = Skia.Path.MakeFromSVGString('M4.5 10.5 L8.5 14.5 L15.5 6')!;
const CROSS = Skia.Path.MakeFromSVGString('M5.5 5.5 L14.5 14.5 M14.5 5.5 L5.5 14.5')!;
const ARC = Skia.PathBuilder.Make()
  .addArc({ x: 2, y: 2, width: ICON - 4, height: ICON - 4 }, 0, 270)
  .detach();

/**
 * A button that shows the work it starts. While loading it folds into a
 * circle with a spinner; on success it opens again in green and traces a
 * check, and on error it turns red, traces a cross and shakes.
 */
export function StatusButton({
  children,
  status,
  onPress,
  successLabel = 'Done',
  errorLabel = 'Try again',
  haptics = true,
  disabled = false,
  style,
}: StatusButtonProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);

  // Natural width of each label, measured off screen, so the width can spring between them.
  const [widths, setWidths] = useState({ idle: 0, success: 0, error: 0 });
  const measure = (key: keyof typeof widths) => (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    setWidths((s) => (s[key] === w ? s : { ...s, [key]: w }));
  };

  const width = useSharedValue(0);
  const success = useSharedValue(0);
  const error = useSharedValue(0);
  const loading = useSharedValue(0);
  const trace = useSharedValue(0);
  const shake = useSharedValue(0);
  const pressed = useSharedValue(0);
  const time = useShaderClock({ running: status === 'loading' && !reduced });

  const target =
    status === 'loading'
      ? HEIGHT
      : status === 'success'
        ? widths.success
        : status === 'error'
          ? widths.error
          : widths.idle;

  const previous = useRef(status);
  useEffect(() => {
    if (target === 0) return;
    // The first measurement jumps; later changes spring.
    width.set(width.get() === 0 ? target : withSpring(target, spring('smooth', reduced)));
  }, [target, reduced, width]);

  useEffect(() => {
    const was = previous.current;
    previous.current = status;
    loading.set(withTiming(status === 'loading' ? 1 : 0, timing('quick', reduced)));
    success.set(withTiming(status === 'success' ? 1 : 0, timing('base', reduced)));
    error.set(withTiming(status === 'error' ? 1 : 0, timing('base', reduced)));
    trace.set(0);
    if (status === 'success' || status === 'error') {
      trace.set(withTiming(1, { ...timing('slow', reduced), duration: 420 }));
    }
    if (was === status) return;
    if (status === 'success') haptic('success');
    if (status === 'error') {
      haptic('error');
      if (!reduced) {
        shake.set(
          withSequence(
            withTiming(-8, { duration: 50 }),
            withTiming(8, { duration: 70 }),
            withTiming(-5, { duration: 60 }),
            withTiming(4, { duration: 60 }),
            withSpring(0, spring('bouncy')),
          ),
        );
      }
    }
    // `haptic` is a stable function of the haptics flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reduced]);

  const interactive = !disabled && (status === 'idle' || status === 'error');
  const press = () => onPress?.();

  const tap = Gesture.Tap()
    .withTestId('status-button')
    .enabled(interactive)
    .maxDuration(60_000)
    .maxDistance(32)
    .onBegin(() => {
      pressed.set(withSpring(1, spring('snappy', reduced)));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, spring('bouncy', reduced)));
    })
    .onEnd((_e, ok) => {
      if (ok) scheduleOnRN(press);
    });

  const shell = useAnimatedStyle(() => ({
    width: width.get() || undefined,
    transform: [{ translateX: shake.get() }, { scale: 1 - pressed.get() * 0.04 }],
  }));
  const successFill = useAnimatedStyle(() => ({ opacity: success.get() }));
  const errorFill = useAnimatedStyle(() => ({ opacity: error.get() }));
  const idleLabel = useAnimatedStyle(() => {
    const out = Math.max(loading.get(), success.get(), error.get());
    return { opacity: 1 - out, transform: [{ scale: 1 - out * 0.15 }] };
  });
  const spinner = useAnimatedStyle(() => ({
    opacity: loading.get(),
    transform: [{ scale: 0.6 + loading.get() * 0.4 }],
  }));
  const successRow = useAnimatedStyle(() => ({
    opacity: success.get(),
    transform: [{ translateY: (1 - success.get()) * 8 }],
  }));
  const errorRow = useAnimatedStyle(() => ({
    opacity: error.get(),
    transform: [{ translateY: (1 - error.get()) * 8 }],
  }));

  const turn = useDerivedValue(() => [{ rotate: time.get() * Math.PI * 2.4 }]);
  const traced = useDerivedValue(() => trace.get());

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && interactive) press();
  };

  const label = (text: string, color: string) => (
    <Text
      numberOfLines={1}
      style={{ color, fontSize: font.size.md, fontWeight: font.weight.semibold }}
    >
      {text}
    </Text>
  );
  const name =
    status === 'loading'
      ? `${children}, in progress`
      : status === 'success'
        ? successLabel
        : status === 'error'
          ? errorLabel
          : children;

  return (
    <View style={[styles.slot, style]}>
      {/* Off-screen copies that measure each label's natural width. */}
      <View
        style={styles.measure}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.measureRow} onLayout={measure('idle')}>
          {label(children, colors.onEmber)}
        </View>
        <View style={[styles.measureRow, styles.withIcon]} onLayout={measure('success')}>
          <View style={{ width: ICON }} />
          {label(successLabel, colors.onEmber)}
        </View>
        <View style={[styles.measureRow, styles.withIcon]} onLayout={measure('error')}>
          <View style={{ width: ICON }} />
          {label(errorLabel, colors.onEmber)}
        </View>
      </View>

      <GestureDetector gesture={tap}>
        <Animated.View
          collapsable={false}
          accessible
          accessibilityRole="button"
          accessibilityLabel={name}
          accessibilityState={{ disabled: disabled || !interactive, busy: status === 'loading' }}
          accessibilityLiveRegion="polite"
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={onAccessibilityAction}
          style={[
            styles.button,
            { backgroundColor: colors.ember, opacity: disabled ? 0.45 : 1 },
            shell,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.success }, successFill]}
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.danger }, errorFill]}
          />

          <Animated.View style={[styles.layer, idleLabel]}>
            {label(children, colors.onEmber)}
          </Animated.View>

          <Animated.View style={[styles.layer, spinner]} pointerEvents="none">
            <View style={styles.icon}>
              <Canvas style={StyleSheet.absoluteFill}>
                <Group origin={vec(ICON / 2, ICON / 2)} transform={turn}>
                  <Path
                    path={ARC}
                    style="stroke"
                    strokeWidth={2.25}
                    strokeCap="round"
                    color={colors.onEmber}
                  />
                </Group>
              </Canvas>
            </View>
          </Animated.View>

          <Animated.View style={[styles.layer, styles.withIcon, successRow]} pointerEvents="none">
            <View style={styles.icon}>
              <Canvas style={StyleSheet.absoluteFill}>
                <Path
                  path={CHECK}
                  style="stroke"
                  strokeWidth={2.4}
                  strokeCap="round"
                  strokeJoin="round"
                  color={colors.onEmber}
                  end={traced}
                />
              </Canvas>
            </View>
            {label(successLabel, colors.onEmber)}
          </Animated.View>

          <Animated.View style={[styles.layer, styles.withIcon, errorRow]} pointerEvents="none">
            <View style={styles.icon}>
              <Canvas style={StyleSheet.absoluteFill}>
                <Path
                  path={CROSS}
                  style="stroke"
                  strokeWidth={2.4}
                  strokeCap="round"
                  color={colors.onEmber}
                  end={traced}
                />
              </Canvas>
            </View>
            {label(errorLabel, colors.onEmber)}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: HEIGHT, alignSelf: 'flex-start', alignItems: 'center' },
  button: {
    height: HEIGHT,
    minWidth: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withIcon: { gap: 8 },
  icon: { width: ICON, height: ICON },
  // Wide enough that labels never wrap while being measured.
  measure: { position: 'absolute', opacity: 0, top: 0, left: 0, width: 640 },
  measureRow: {
    position: 'absolute',
    flexDirection: 'row',
    paddingHorizontal: PAD,
    alignSelf: 'flex-start',
  },
});
