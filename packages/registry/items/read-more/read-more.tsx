import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type ReadMoreProps = {
  /** The text. Paragraphs can be separated with blank lines. */
  children: string;
  /** Lines shown while folded. Defaults to 3. */
  lines?: number;
  /** Defaults to 'Read more'. */
  moreLabel?: string;
  /** Defaults to 'Show less'. */
  lessLabel?: string;
  /** The colour behind the text, as `#RRGGBB`; the last line fades into it. Defaults to the theme surface. */
  fadeColor?: string;
  /** Controlled state. Leave unset to let the component keep its own. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Style for the text. Set `lineHeight` here if you change the font size. */
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Long text folded to a few lines whose last line fades away. Read more
 * lets the text out to its full height on a spring while the fade dissolves;
 * Show less folds it back.
 */
export function ReadMore({
  children,
  lines = 3,
  moreLabel = 'Read more',
  lessLabel = 'Show less',
  fadeColor,
  expanded,
  onExpandedChange,
  textStyle,
  testID,
  style,
}: ReadMoreProps) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [inner, setInner] = useState(false);
  const isOpen = expanded ?? inner;
  const [full, setFull] = useState(0);

  const flat = StyleSheet.flatten([
    {
      color: colors.textMuted,
      fontSize: font.size.md,
      lineHeight: Math.round(font.size.md * 1.55),
    },
    textStyle,
  ]);
  const lineHeight = flat.lineHeight ?? Math.round((flat.fontSize ?? font.size.md) * 1.55);
  const folded = lines * lineHeight;
  // Only offer the toggle when there is more to read.
  const long = full > folded + 1;

  const t = useSharedValue(isOpen ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(isOpen ? 1 : 0, spring('smooth', reduced)));
  }, [isOpen, reduced, t]);

  const toggle = () => {
    const next = !isOpen;
    if (expanded === undefined) setInner(next);
    onExpandedChange?.(next);
  };

  // The text is laid out on its own (absolutely), so it is measured at its full height
  // whatever the box's height is; the box alone does the folding.
  const box = useAnimatedStyle(() => ({
    height: full === 0 ? folded : long ? folded + (full - folded) * Math.max(0, t.get()) : full,
  }));
  const fade = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, t.get()) * 1.5) }));
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${45 + t.get() * 180}deg` }, { translateY: t.get() * 2 - 2 }],
  }));

  const ground = fadeColor ?? colors.surface;

  return (
    <View testID={testID} style={style}>
      <Animated.View style={[styles.box, box]}>
        <Text
          style={[flat, styles.text]}
          onLayout={(e) => setFull(Math.ceil(e.nativeEvent.layout.height))}
        >
          {children}
        </Text>
        {long ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fade,
              { height: lineHeight * 1.6 },
              gradient(`linear-gradient(to bottom, ${withAlpha(ground, 0)}, ${ground})`),
              fade,
            ]}
          />
        ) : null}
      </Animated.View>
      {long ? (
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          style={({ pressed }) => [styles.toggle, { gap: space[2], opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
          >
            {isOpen ? lessLabel : moreLabel}
          </Text>
          <Animated.View style={[styles.chevron, { borderColor: colors.text }, chevron]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  text: { position: 'absolute', top: 0, left: 0, right: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: minTouchTarget,
  },
  // The bottom and right edges of a small square, turned to point down.
  chevron: { width: 7, height: 7, borderRightWidth: 1.5, borderBottomWidth: 1.5 },
});
