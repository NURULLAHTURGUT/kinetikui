import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ScrollTab = {
  key: string;
  title: string;
  content: ReactNode;
};

export type ScrollTabsProps = {
  tabs: readonly ScrollTab[];
  /** The tab shown first. Defaults to 0. */
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  /** A tick when the tab changes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const TAB_H = 48;
const PAD = 16;
const LINE = 3;

/**
 * Tabs over pages you can swipe. The underline is tied to the swipe itself:
 * it slides between tabs, stretching a little in the middle of the move, the
 * labels brighten as their page arrives, and the strip scrolls to keep the
 * current tab in view.
 */
export function ScrollTabs({
  tabs,
  initialIndex = 0,
  onIndexChange,
  haptics = true,
  testID,
  style,
}: ScrollTabsProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const strip = useRef<ScrollView>(null);
  const pager = useAnimatedRef<Animated.ScrollView>();
  const [index, setIndex] = useState(initialIndex);
  const [width, setWidth] = useState(0);
  const [stripW, setStripW] = useState(0);
  const [spots, setSpots] = useState<{ x: number; w: number }[]>([]);
  const xs = useSharedValue<number[]>([]);
  const ws = useSharedValue<number[]>([]);
  const progress = useSharedValue(initialIndex);

  // Underline spans: the label inside each tab's padding.
  const place = (i: number, x: number, w: number) => {
    setSpots((prev) => {
      if (prev[i]?.x === x && prev[i]?.w === w) return prev;
      const next = [...prev];
      next[i] = { x, w };
      return next;
    });
  };
  useEffect(() => {
    xs.set(spots.map((s) => s?.x ?? 0));
    ws.set(spots.map((s) => s?.w ?? 0));
  }, [spots, xs, ws]);

  const reveal = (i: number) => {
    const spot = spots[i];
    if (!spot || stripW === 0) return;
    strip.current?.scrollTo({
      x: Math.max(0, spot.x + spot.w / 2 - stripW / 2),
      animated: !reduced,
    });
  };

  const settle = (i: number) => {
    if (i === index) return;
    haptic('tick');
    setIndex(i);
    reveal(i);
    onIndexChange?.(i);
  };

  const select = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: !reduced });
    if (reduced || width === 0) progress.set(i);
    settle(i);
  };

  // The web ignores contentOffset, so the first page is also set once there is a width.
  const opened = useRef(false);
  useEffect(() => {
    if (width === 0 || opened.current) return;
    opened.current = true;
    if (initialIndex > 0) pager.current?.scrollTo({ x: initialIndex * width, animated: false });
  }, [width, initialIndex, pager]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (width > 0) progress.set(e.contentOffset.x / width);
    },
  });

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    settle(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const line = useAnimatedStyle(() => {
    const x = xs.get();
    const w = ws.get();
    if (x.length === 0) return { opacity: 0 };
    const p = Math.max(0, Math.min(x.length - 1, progress.get()));
    const i = Math.floor(p);
    const j = Math.min(x.length - 1, i + 1);
    const f = p - i;
    const left = (x[i] ?? 0) + ((x[j] ?? 0) - (x[i] ?? 0)) * f;
    const width = (w[i] ?? 0) + ((w[j] ?? 0) - (w[i] ?? 0)) * f;
    // Halfway between two tabs the line is a little longer, like it is being pulled.
    const pull = Math.sin(f * Math.PI) * 14;
    return { opacity: 1, left: left - pull / 2, width: width + pull };
  });

  return (
    <View testID={testID} style={style}>
      <View style={[styles.stripBox, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setStripW(e.nativeEvent.layout.width)}
          accessibilityRole="tablist"
        >
          {tabs.map((tab, i) => (
            <Tab
              key={tab.key}
              title={tab.title}
              index={i}
              selected={i === index}
              progress={progress}
              onPress={() => select(i)}
              onPlace={(x, w) => place(i, x, w)}
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[styles.line, { backgroundColor: colors.text }, line]}
          />
        </ScrollView>
      </View>
      <View
        testID={testID ? `${testID}-pages-box` : undefined}
        style={styles.pages}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Animated.ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={onEnd}
            scrollEventThrottle={16}
            contentOffset={{ x: initialIndex * width, y: 0 }}
            testID={testID ? `${testID}-pages` : undefined}
          >
            {tabs.map((tab, i) => (
              <View
                key={tab.key}
                style={{ width }}
                accessibilityElementsHidden={i !== index}
                importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
              >
                {tab.content}
              </View>
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>
    </View>
  );
}

type TabProps = {
  title: string;
  index: number;
  selected: boolean;
  progress: SharedValue<number>;
  onPress: () => void;
  onPlace: (x: number, w: number) => void;
};

function Tab({ title, index, selected, progress, onPress, onPlace }: TabProps) {
  const { colors, font } = useKinetikTheme();
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(1, Math.abs(progress.get() - index)),
      [0, 1],
      [colors.text, colors.textSubtle],
    ),
  }));
  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onPlace(x + PAD, width - PAD * 2);
      }}
      accessibilityRole="tab"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      style={styles.tab}
    >
      <Animated.Text style={[{ fontSize: font.size.md, fontWeight: font.weight.semibold }, label]}>
        {title}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stripBox: { borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { height: TAB_H, paddingHorizontal: PAD, justifyContent: 'center' },
  line: { position: 'absolute', bottom: 0, height: LINE, borderRadius: LINE },
  pages: { minHeight: 1 },
});
