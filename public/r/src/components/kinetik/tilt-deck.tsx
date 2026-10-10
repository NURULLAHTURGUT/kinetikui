import { createContext, useContext, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

type TiltState = {
  /** -1 (left) … 1 (right) */
  x: SharedValue<number>;
  /** -1 (top) … 1 (bottom) */
  y: SharedValue<number>;
  /** 0 at rest, 1 while pressed */
  press: SharedValue<number>;
  parallax: number;
  reduced: boolean;
};

const TiltContext = createContext<TiltState | null>(null);

export type TiltDeckProps = Omit<ViewProps, 'style' | 'children'> & {
  children?: ReactNode;
  /** Maximum rotation in degrees. Defaults to 12. */
  maxTilt?: number;
  /** Scale while pressed. Defaults to 1.03. */
  lift?: number;
  /** How far `TiltLayer`s travel per unit of depth, in pt. Defaults to 10. */
  parallax?: number;
  /** Called on a tap that does not drag. Makes the card a button. */
  onPress?: () => void;
  /** Plays a light tap on press. Defaults to true. */
  haptics?: boolean;
  /** Corner radius. Defaults to the theme `xl` radius. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Style for the inner content container (padding, layout). */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * A card that tilts in 3D under the finger: the pressed corner sinks away,
 * the floor shadow slides the other way and `TiltLayer` children parallax by
 * depth. Touch tracking never claims the gesture, so it scrolls normally.
 */
export function TiltDeck({
  children,
  maxTilt = 12,
  lift = 1.03,
  parallax = 10,
  onPress,
  haptics = true,
  radius,
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
  ...viewProps
}: TiltDeckProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const r = radius ?? theme.radius.xl;

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const press = useSharedValue(0);
  const size = useSharedValue({ width: 0, height: 0 });

  const aim = (tx: number, ty: number) => {
    'worklet';
    const { width, height } = size.get();
    if (width === 0 || height === 0) return;
    const nx = Math.max(-1, Math.min(1, (tx / width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, (ty / height) * 2 - 1));
    x.set(withSpring(reduced ? 0 : nx, spring('snappy', reduced)));
    y.set(withSpring(reduced ? 0 : ny, spring('snappy', reduced)));
  };

  const settle = () => {
    'worklet';
    x.set(withSpring(0, spring('bouncy', reduced)));
    y.set(withSpring(0, spring('bouncy', reduced)));
    press.set(withSpring(0, spring('smooth', reduced)));
  };

  const pressed = () => {
    haptic('tap');
    onPress?.();
  };

  const track = Gesture.Manual()
    .withTestId('tilt-deck')
    .onTouchesDown((e) => {
      const t = e.allTouches[0];
      if (!t) return;
      press.set(withSpring(1, spring('snappy', reduced)));
      aim(t.x, t.y);
    })
    .onTouchesMove((e) => {
      const t = e.allTouches[0];
      if (t) aim(t.x, t.y);
    })
    .onTouchesUp(() => settle())
    .onTouchesCancelled(() => settle());

  const tap = Gesture.Tap()
    .withTestId('tilt-deck-tap')
    .enabled(onPress !== undefined)
    .maxDuration(1000)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(pressed);
    });

  const gesture = Gesture.Simultaneous(track, tap);

  const cardStyle = useAnimatedStyle(() => {
    const p = press.get();
    return {
      transform: [
        { perspective: 800 },
        { scale: reduced ? 1 - p * 0.02 : 1 + (lift - 1) * p },
        { rotateX: `${-y.get() * maxTilt}deg` },
        { rotateY: `${x.get() * maxTilt}deg` },
      ],
    };
  });

  // The floor shadow drifts away from the sinking corner and spreads on lift.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + press.get() * 0.45,
    transform: [
      { translateX: -x.get() * 8 },
      { translateY: 6 - y.get() * 8 + press.get() * 8 },
      { scale: 0.94 + press.get() * 0.04 },
    ],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && onPress) pressed();
  };

  return (
    <TiltContext.Provider value={{ x, y, press, parallax, reduced }}>
      <GestureDetector gesture={gesture}>
        <View
          collapsable={false}
          {...viewProps}
          accessible={onPress !== undefined || accessibilityLabel !== undefined}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityActions={onPress ? [{ name: 'activate' }] : undefined}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => {
            size.set({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
            viewProps.onLayout?.(e);
          }}
          style={style}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: r, boxShadow: theme.shadow.lg },
              shadowStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.card,
              {
                borderRadius: r,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              cardStyle,
            ]}
          >
            <View style={[{ padding: theme.space[5] }, contentStyle]}>{children}</View>
          </Animated.View>
        </View>
      </GestureDetector>
    </TiltContext.Provider>
  );
}

export type TiltLayerProps = ViewProps & {
  /**
   * How far this layer floats above the card. 0 stays flat; 1 travels the
   * deck's full `parallax` distance; negative values sink below the surface.
   */
  depth?: number;
};

/**
 * A child of `TiltDeck` that shifts with the tilt to read as a separate plane.
 * A `transform` array in `style` is kept and applied after the parallax offset.
 */
export function TiltLayer({ depth = 1, style, ...props }: TiltLayerProps) {
  const ctx = useContext(TiltContext);
  const { transform, ...rest } = StyleSheet.flatten(style) ?? {};
  const own = Array.isArray(transform) ? transform : [];
  const animated = useAnimatedStyle(() => {
    const k = !ctx || ctx.reduced ? 0 : ctx.parallax * depth;
    return {
      transform: [
        { translateX: (ctx?.x.get() ?? 0) * k },
        { translateY: (ctx?.y.get() ?? 0) * k },
        ...own,
      ],
    };
  });
  return <Animated.View {...props} style={[rest, animated]} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
