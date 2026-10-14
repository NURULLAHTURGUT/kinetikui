import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type PaletteStripAction = {
  icon: ReactNode;
  /** Accessible name, e.g. "Shuffle palette". */
  label: string;
  onPress: () => void;
};

export type PaletteStripProps = {
  /** The colours, left to right. Change them and each swatch wipes to its new colour in turn. */
  colors: readonly string[];
  /** Names read by screen readers instead of the colour values, e.g. ["Snow", "Slate", "Lagoon"]. */
  names?: readonly string[];
  /** Makes each swatch a button, e.g. to copy or edit that colour. */
  onSwatchPress?: (index: number, color: string) => void;
  /** A round button at the end, e.g. shuffle. It spins on each press. */
  action?: PaletteStripAction;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 44;

/**
 * A row of colour swatches joined into one rounded bar. When the colours
 * change, each swatch wipes up to its new colour a beat after its neighbour,
 * and the shuffle button turns a full circle.
 */
export function PaletteStrip({
  colors: palette,
  names,
  onSwatchPress,
  action,
  style,
}: PaletteStripProps) {
  const { colors, radius, space } = useKinetikTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          paddingLeft: space[2],
          paddingRight: action ? space[1] : space[2],
          gap: space[2],
        },
        style,
      ]}
    >
      <View
        accessibilityRole={onSwatchPress ? undefined : 'image'}
        accessibilityLabel={
          onSwatchPress
            ? undefined
            : `Palette: ${palette.map((c, i) => names?.[i] ?? c).join(', ')}`
        }
        accessible={!onSwatchPress}
        style={[styles.bar, { borderRadius: radius.md }]}
      >
        {palette.map((color, i) => (
          <Swatch
            key={i}
            index={i}
            color={color}
            name={names?.[i] ?? color}
            onPress={onSwatchPress ? () => onSwatchPress(i, color) : undefined}
          />
        ))}
      </View>
      {action ? <SpinButton action={action} /> : null}
    </View>
  );
}

function Swatch({
  index,
  color,
  name,
  onPress,
}: {
  index: number;
  color: string;
  name: string;
  onPress?: () => void;
}) {
  const reduced = useReduceMotion();
  // The colour on show underneath while the new one wipes in over it.
  const [seen, setSeen] = useState(color);
  const [under, setUnder] = useState(color);
  if (color !== seen) {
    setUnder(seen);
    setSeen(color);
  }
  const wipe = useSharedValue(1);
  const bump = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      wipe.set(1);
      return;
    }
    wipe.set(0);
    wipe.set(withDelay(index * 70, withTiming(1, { ...timing('slow'), duration: 420 })));
  }, [color, index, reduced, wipe]);

  const top = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - wipe.get()) * HEIGHT }] }));
  const press = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - bump.get() * 0.08 }] }));

  const body = (
    <Animated.View style={[styles.fill, press]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: under }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color }, top]} />
    </Animated.View>
  );

  if (!onPress) return <View style={styles.swatch}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => {
        if (!reduced) {
          bump.set(withSequence(withTiming(1, timing('quick')), withSpring(0, spring('bouncy'))));
        }
        onPress();
      }}
      style={styles.swatch}
    >
      {body}
    </Pressable>
  );
}

function SpinButton({ action }: { action: PaletteStripAction }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const turn = useSharedValue(0);
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * 360}deg` }, { scale: 1 - press.get() * 0.12 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={() => {
        if (!reduced) {
          turn.set(withTiming(Math.round(turn.get()) + 1, { ...timing('slow'), duration: 600 }));
        }
        action.onPress();
      }}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? withAlpha(colors.text, 0.06) : 'transparent' },
      ]}
    >
      <Animated.View style={style}>{action.icon}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  bar: { flex: 1, height: HEIGHT, flexDirection: 'row', overflow: 'hidden' },
  swatch: { flex: 1 },
  fill: { flex: 1, overflow: 'hidden' },
  action: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
