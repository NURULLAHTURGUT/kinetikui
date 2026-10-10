import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type FlipLedgerProps = {
  /** Face shown when not flipped. */
  front: ReactNode;
  /** Face shown when flipped. */
  back: ReactNode;
  /** Controlled flip state. Leave undefined to let the card manage it. */
  flipped?: boolean;
  /** Initial state when uncontrolled. Defaults to false. */
  defaultFlipped?: boolean;
  /** Called with the next state whenever the card is flipped by the user. */
  onFlippedChange?: (flipped: boolean) => void;
  /** Rotation axis. `y` flips like a page, `x` like a flap. Defaults to `y`. */
  axis?: 'x' | 'y';
  /** Flip when tapped. Defaults to true. Set false to drive it only through `flipped`. */
  flipOnPress?: boolean;
  /** Plays a light tap when the card lands. Defaults to true. */
  haptics?: boolean;
  /** Accessibility label for the card as a whole. */
  accessibilityLabel?: string;
  /** Corner radius. Defaults to the theme `xl` radius. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Style applied to both faces (padding, background). */
  faceStyle?: StyleProp<ViewStyle>;
};

/** A two-sided card that turns over in 3D, sized to the taller of its faces. */
export function FlipLedger({
  front,
  back,
  flipped: controlled,
  defaultFlipped = false,
  onFlippedChange,
  axis = 'y',
  flipOnPress = true,
  haptics = true,
  accessibilityLabel,
  radius,
  style,
  faceStyle,
}: FlipLedgerProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [internal, setInternal] = useState(defaultFlipped);
  const [heights, setHeights] = useState({ front: 0, back: 0 });
  const contentHeight = Math.max(heights.front, heights.back);
  const flipped = controlled ?? internal;
  const r = radius ?? theme.radius.xl;

  // 0 = front, 1 = back. Rotation and lift both derive from it.
  const progress = useSharedValue(flipped ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    const target = flipped ? 1 : 0;
    if (reduced) {
      progress.set(withTiming(target, timing('base')));
    } else {
      progress.set(withSpring(target, spring('smooth')));
    }
  }, [flipped, reduced, progress]);

  const toggle = () => {
    const next = !flipped;
    if (controlled === undefined) setInternal(next);
    onFlippedChange?.(next);
    haptic('tap');
  };

  const tap = Gesture.Tap()
    .withTestId('flip-ledger')
    .enabled(flipOnPress)
    .onBegin(() => {
      press.set(withSpring(1, spring('snappy', reduced)));
    })
    .onFinalize(() => {
      press.set(withSpring(0, spring('snappy', reduced)));
    })
    .onEnd(() => {
      scheduleOnRN(toggle);
    });

  const flipX = axis === 'x';

  const container = useAnimatedStyle(() => {
    // The card lifts slightly at the midpoint of the turn and when pressed.
    const lift = Math.sin(progress.get() * Math.PI);
    return {
      transform: [{ scale: 1 - press.get() * 0.02 + (reduced ? 0 : lift * 0.04) }],
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduced) return { opacity: 1 - p };
    return { opacity: p < 0.5 ? 1 : 0, transform: turn(p * 180, flipX) };
  });

  const backStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduced) return { opacity: p };
    return { opacity: p >= 0.5 ? 1 : 0, transform: turn(p * 180 - 180, flipX) };
  });

  // A shade sweeps across each face as it turns away from the viewer.
  const frontShade = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : interpolate(progress.get(), [0, 0.5], [0, 0.35], 'clamp'),
  }));
  const backShade = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : interpolate(progress.get(), [0.5, 1], [0.35, 0], 'clamp'),
  }));

  // Both faces take the height of the taller one, so nothing clips mid-turn.
  const measure = (side: 'front' | 'back', height: number) => {
    setHeights((h) => (Math.abs(h[side] - height) < 0.5 ? h : { ...h, [side]: height }));
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && flipOnPress) toggle();
  };

  const face: StyleProp<ViewStyle> = [
    styles.face,
    {
      borderRadius: r,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      padding: theme.space[5],
      boxShadow: theme.shadow.md,
    },
    faceStyle,
  ];
  const shade = [styles.shade, { borderRadius: r, backgroundColor: theme.colors.scrim }];

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole={flipOnPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={flipOnPress ? 'Turns the card over' : undefined}
        accessibilityState={{ expanded: flipped }}
        accessibilityActions={flipOnPress ? [{ name: 'activate' }] : undefined}
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.root, style, container]}
      >
        <Animated.View
          style={[face, frontStyle]}
          pointerEvents={flipped ? 'none' : 'auto'}
          importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={flipped}
        >
          <View style={{ minHeight: contentHeight }}>
            <View onLayout={(e) => measure('front', e.nativeEvent.layout.height)}>{front}</View>
          </View>
          <Animated.View pointerEvents="none" style={[shade, frontShade]} />
        </Animated.View>
        <Animated.View
          style={[face, styles.back, backStyle]}
          pointerEvents={flipped ? 'auto' : 'none'}
          importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!flipped}
        >
          <View style={{ minHeight: contentHeight }}>
            <View onLayout={(e) => measure('back', e.nativeEvent.layout.height)}>{back}</View>
          </View>
          <Animated.View pointerEvents="none" style={[shade, backShade]} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function turn(deg: number, flipX: boolean) {
  'worklet';
  return flipX
    ? [{ perspective: 1200 }, { rotateX: `${-deg}deg` }]
    : [{ perspective: 1200 }, { rotateY: `${deg}deg` }];
}

const styles = StyleSheet.create({
  root: {},
  face: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  back: { position: 'absolute', top: 0, left: 0, right: 0 },
  shade: { ...StyleSheet.absoluteFill },
});
