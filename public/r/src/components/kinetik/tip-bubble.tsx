import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type TipBubbleProps = {
  /** The tip itself. Keep it to a sentence or two. */
  content: string;
  /** The anchor the tip points at, e.g. an info icon or a short label. */
  children: ReactNode;
  /** Names the anchor for screen readers, e.g. "About fees". */
  accessibilityLabel: string;
  /** Above or below the anchor. Defaults to `top`. */
  placement?: 'top' | 'bottom';
  /** Which edge of the bubble lines up with the anchor. Defaults to `center`. */
  align?: 'start' | 'center' | 'end';
  /** Controlled state. Leave unset to toggle on press. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Closes by itself after this many ms; 0 keeps it open. Defaults to 4000. */
  duration?: number;
  /** Bubble width. Defaults to 220. */
  width?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ARROW = 7;
/** Extra room around the anchor for the finger. */
const HIT = 14;
const OFFSET = 6;

/**
 * A tip that grows out of its anchor. Tap the anchor and a small bubble
 * scales up from the arrow's point, then closes by itself after a few
 * seconds or on a second tap. The tip is announced, not focused, so a screen
 * reader stays on the anchor.
 */
export function TipBubble({
  content,
  children,
  accessibilityLabel,
  placement = 'top',
  align = 'center',
  open,
  onOpenChange,
  duration = 4000,
  width = 220,
  testID,
  style,
}: TipBubbleProps) {
  const { colors, font, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [inner, setInner] = useState(false);
  const isOpen = open ?? inner;
  const [mounted, setMounted] = useState(isOpen);
  const [anchorW, setAnchorW] = useState(0);
  const t = useSharedValue(0);

  const controlled = open !== undefined;
  const setOpen = (next: boolean) => {
    if (!controlled) setInner(next);
    onOpenChange?.(next);
  };
  // The timer that closes the tip calls whichever onOpenChange is current by then.
  const changed = useRef(onOpenChange);
  useEffect(() => {
    changed.current = onOpenChange;
  });

  // Mounted from the moment it opens; unmounted only once it has faded.
  if (isOpen && !mounted) setMounted(true);

  useEffect(() => {
    if (isOpen) {
      t.set(withSpring(1, spring('bouncy', reduced)));
      AccessibilityInfo.announceForAccessibility(content);
      if (duration <= 0) return;
      const id = setTimeout(() => {
        if (!controlled) setInner(false);
        changed.current?.(false);
      }, duration);
      return () => clearTimeout(id);
    }
    t.set(withTiming(0, { duration: reduced ? 0 : durations.quick }));
    // Unmount once the bubble has faded, so it never catches touches.
    const id = setTimeout(() => setMounted(false), reduced ? 0 : durations.quick);
    return () => clearTimeout(id);
  }, [isOpen, reduced, duration, content, controlled, t]);

  const top = placement === 'top';
  // Where the arrow sits along the bubble, and so where the bubble grows from.
  const arrowX =
    align === 'start' ? anchorW / 2 : align === 'end' ? width - anchorW / 2 : width / 2;
  const left = align === 'start' ? 0 : align === 'end' ? anchorW - width : (anchorW - width) / 2;

  const bubble = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.get() * 1.5),
    transform: [{ translateY: (1 - t.get()) * (top ? 6 : -6) }, { scale: 0.6 + t.get() * 0.4 }],
  }));

  return (
    <View testID={testID} style={[styles.root, style]}>
      <Pressable
        onPress={() => setOpen(!isOpen)}
        onLayout={(e) => setAnchorW(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Shows a tip"
        accessibilityState={{ expanded: isOpen }}
        style={styles.anchor}
      >
        {children}
      </Pressable>
      {mounted ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.bubble,
            {
              width,
              left,
              ...(top
                ? { bottom: '100%', marginBottom: OFFSET + ARROW - HIT }
                : { top: '100%', marginTop: OFFSET + ARROW - HIT }),
              transformOrigin: `${arrowX}px ${top ? '100%' : '0%'}`,
            },
            bubble,
          ]}
        >
          <View
            style={[
              styles.arrow,
              { left: arrowX - ARROW, backgroundColor: colors.ember },
              top ? { bottom: -ARROW + 2 } : { top: -ARROW + 2 },
            ]}
          />
          <View
            style={[
              styles.body,
              { backgroundColor: colors.ember, borderRadius: radius.md, boxShadow: shadow.md },
            ]}
          >
            <Text style={{ color: colors.onEmber, fontSize: font.size.sm, lineHeight: 19 }}>
              {content}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The negative margin on the root keeps the layout as it was, while the anchor's padding
  // grows its box (and so its accessibility bounds) to at least 44 pt.
  root: { alignSelf: 'flex-start', zIndex: 10, margin: -HIT },
  anchor: {
    padding: HIT,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { position: 'absolute', zIndex: 10 },
  body: { paddingHorizontal: 12, paddingVertical: 9 },
  // A square turned 45° behind the body: half of it shows as the arrow.
  arrow: {
    position: 'absolute',
    width: ARROW * 2,
    height: ARROW * 2,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});
