import { spring } from '@kinetik/registry/shared/motion/motion';
import { useReduceMotion } from '@kinetik/registry/shared/hooks/use-reduce-motion';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Playground pressable with a restrained press-in scale. */
export function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const reduced = useReduceMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, spring('snappy', reduced)));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, spring('bouncy', reduced)));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
