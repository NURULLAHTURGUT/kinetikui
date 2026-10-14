import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressJelly } from '../press-jelly';
import { WordCascade } from '../word-cascade';
import { spring, timing } from '../../../lib/kinetik/motion/motion';
import { useReduceMotion } from '../../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../../lib/kinetik/tokens/tokens';

export type OnboardingSlide = {
  key: string;
  /** Small chip above the title, e.g. "Easy sign-up". */
  tag?: string;
  title: string;
  /**
   * Fills the rounded panel at the top. Receives whether its slide is the
   * current one, so it can play only while visible. Defaults to built-in
   * illustrations.
   */
  visual?: (active: boolean) => ReactNode;
};

export type OnboardingProps = {
  /** Called by the button on the last slide. */
  onFinish: () => void;
  /** Called by the link under the button. Hidden when omitted. */
  onSkip?: () => void;
  slides?: readonly OnboardingSlide[];
  /** Button label before the last slide. Defaults to "Continue". */
  nextLabel?: string;
  /** Button label on the last slide. Defaults to "Get started". */
  finishLabel?: string;
  /** Link label. Defaults to "Maybe later". */
  skipLabel?: string;
};

const DEFAULT_SLIDES: OnboardingSlide[] = [
  { key: 'welcome', tag: 'Welcome', title: 'Everything you track, in one calm place' },
  { key: 'setup', tag: 'Easy setup', title: 'Set up your account in under a minute' },
  { key: 'nudge', tag: 'Stay on top', title: 'A nudge only when it really matters' },
];

const DEFAULT_VISUALS = [
  (active: boolean) => <CardStack active={active} />,
  (active: boolean) => <Checklist active={active} />,
  (active: boolean) => <Nudge active={active} />,
];

/**
 * A paged welcome: a rounded illustration panel, a thin progress line that
 * follows the finger, a tag and a title that rises in word by word, and one
 * clear button with a quiet "Maybe later" under it.
 */
export function Onboarding({
  onFinish,
  onSkip,
  slides = DEFAULT_SLIDES,
  nextLabel = 'Continue',
  finishLabel = 'Get started',
  skipLabel = 'Maybe later',
}: OnboardingProps) {
  const { colors, space, font } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const last = index >= count - 1;

  const onScroll = useAnimatedScrollHandler((e) => {
    offset.set(e.contentOffset.x);
  });

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = widthRef.current;
    if (w > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  const next = () => {
    if (last) return onFinish();
    const to = index + 1;
    scroller.current?.scrollTo({ x: to * widthRef.current, animated: true });
    setIndex(to);
  };

  const pad = space[6];

  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + space[3],
          paddingBottom: insets.bottom + space[4],
        },
      ]}
      onLayout={onLayout}
      testID="onboarding"
    >
      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settle}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        style={styles.fill}
      >
        {width > 0 &&
          slides.map((slide, i) => {
            const active = i === index;
            return (
              <View
                key={slide.key}
                style={{
                  width,
                  height: height || undefined,
                  paddingHorizontal: pad,
                  paddingBottom: space[6],
                  gap: space[5],
                }}
                accessibilityElementsHidden={!active}
                importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
              >
                <Panel>{(slide.visual ?? DEFAULT_VISUALS[i % 3])?.(active)}</Panel>
                <Track index={i} count={count} offset={offset} width={width} />
                <View style={{ gap: space[3], alignItems: 'flex-start' }}>
                  {slide.tag ? (
                    <View
                      style={[
                        styles.tag,
                        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: font.size.xs,
                          fontWeight: font.weight.semibold,
                        }}
                      >
                        {slide.tag}
                      </Text>
                    </View>
                  ) : null}
                  <WordCascade
                    text={slide.title}
                    replayKey={active ? `${slide.key}-on` : slide.key}
                    stagger={55}
                    rise={14}
                    style={{
                      color: colors.text,
                      fontSize: font.size['2xl'],
                      lineHeight: 34,
                      fontWeight: font.weight.bold,
                      letterSpacing: font.tracking.tight,
                    }}
                  />
                </View>
              </View>
            );
          })}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: pad, gap: space[2] }}>
        <PressJelly block size="lg" onPress={next}>
          {last ? finishLabel : nextLabel}
        </PressJelly>
        {onSkip ? (
          <Pressable accessibilityRole="button" onPress={onSkip} style={styles.link} hitSlop={4}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: font.weight.medium,
                textDecorationLine: 'underline',
              }}
            >
              {skipLabel}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.link} />
        )}
      </View>
    </View>
  );
}

/** The rounded panel every illustration sits in. */
function Panel({ children }: { children: ReactNode }) {
  const { colors, radius } = useKinetikTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
        },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A hairline under the panel with one darker segment per slide. Every slide
 * draws it, so it scrolls with the page; the segment itself counters the
 * scroll and slides along the line as the finger moves.
 */
function Track({
  index,
  count,
  offset,
  width,
}: {
  index: number;
  count: number;
  offset: SharedValue<number>;
  width: number;
}) {
  const { colors, space } = useKinetikTheme();
  const inner = width - space[6] * 2;
  const segment = inner / count;
  const style = useAnimatedStyle(() => {
    const progress = width > 0 ? offset.get() / width : 0;
    return { transform: [{ translateX: progress * segment }] };
  });
  // Only the current slide's line is visible; the others fade as they leave.
  const fade = useAnimatedStyle(() => {
    const progress = width > 0 ? offset.get() / width - index : 0;
    return { opacity: interpolate(Math.abs(progress), [0, 0.6], [1, 0], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      style={[styles.track, { backgroundColor: colors.track }, fade]}
    >
      <Animated.View
        style={[styles.segment, { width: segment, backgroundColor: colors.text }, style]}
      />
    </Animated.View>
  );
}

/** Three cards that fan out and drift, standing for "everything in one place". */
function CardStack({ active }: { active: boolean }) {
  const { colors, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const fan = useSharedValue(reduced ? 1 : 0);
  const float = useSharedValue(0);

  useEffect(() => {
    fan.set(active ? withDelay(120, withSpring(1, spring('bouncy', reduced))) : 0);
    float.set(
      active && !reduced
        ? withRepeat(withTiming(1, { ...timing('slow', false, 'inOut'), duration: 2400 }), -1, true)
        : 0,
    );
  }, [active, reduced, fan, float]);

  const face = (fill: string, lines: number[]) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: space[3],
          gap: space[2],
        },
      ]}
    >
      <View style={[styles.cardDot, { backgroundColor: fill }]} />
      {lines.map((w, i) => (
        <View key={i} style={[styles.line, { width: `${w}%`, backgroundColor: colors.track }]} />
      ))}
      <View style={[styles.cardBar, { backgroundColor: fill, borderRadius: radius.sm }]} />
    </View>
  );

  return (
    <View style={styles.center}>
      <FanCard angle={-9} shift={-46} fan={fan} float={float}>
        {face(colors.azure, [70, 46])}
      </FanCard>
      <FanCard angle={9} shift={46} fan={fan} float={float}>
        {face(colors.success, [58, 80])}
      </FanCard>
      <FanCard angle={0} shift={0} fan={fan} float={float}>
        {face(colors.ember, [82, 54])}
      </FanCard>
    </View>
  );
}

function FanCard({
  angle,
  shift,
  fan,
  float,
  children,
}: {
  angle: number;
  shift: number;
  fan: SharedValue<number>;
  float: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: shift * fan.get() },
      { translateY: -float.get() * (angle === 0 ? 8 : 4) },
      { rotate: `${angle * fan.get()}deg` },
    ],
  }));
  return <Animated.View style={[styles.layer, style]}>{children}</Animated.View>;
}

const CHECKS = ['Create your profile', 'Pick what you follow', 'Turn on reminders'];

/** A setup list that ticks itself off, row by row. */
function Checklist({ active }: { active: boolean }) {
  const { colors, radius, space, font } = useKinetikTheme();
  return (
    <View style={styles.center}>
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: space[4],
            gap: space[3],
          },
        ]}
      >
        {CHECKS.map((label, i) => (
          <CheckRow key={label} label={label} index={i} active={active} />
        ))}
        <View style={[styles.line, { width: '40%', backgroundColor: colors.track }]} />
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>About a minute</Text>
      </View>
    </View>
  );
}

function CheckRow({ label, index, active }: { label: string; index: number; active: boolean }) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const done = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    done.set(
      active
        ? withDelay(reduced ? 0 : 450 + index * 420, withSpring(1, spring('bouncy', reduced)))
        : 0,
    );
  }, [active, reduced, index, done]);

  const fill = useAnimatedStyle(() => ({
    opacity: Math.min(1, done.get()),
    transform: [{ scale: done.get() }],
  }));
  const text = useAnimatedStyle(() => ({ opacity: 0.55 + Math.min(1, done.get()) * 0.45 }));

  return (
    <View style={[styles.row, { gap: space[3] }]}>
      <View style={[styles.box, { borderColor: colors.borderStrong }]}>
        <Animated.View style={[styles.boxFill, { backgroundColor: colors.ember }, fill]}>
          <Text style={{ color: colors.onEmber, fontSize: 11, fontWeight: font.weight.heavy }}>
            ✓
          </Text>
        </Animated.View>
      </View>
      <Animated.Text
        style={[
          { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
          text,
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

/** A notification drops in over a quiet screen, then tucks away again. */
function Nudge({ active }: { active: boolean }) {
  const { colors, radius, space, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const drop = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) {
      drop.set(reduced ? 1 : 0);
      ring.set(0);
      return;
    }
    drop.set(
      withRepeat(
        withSequence(
          withDelay(300, withSpring(1, spring('bouncy'))),
          withDelay(1800, withTiming(0, timing('base', false, 'exit'))),
        ),
        -1,
      ),
    );
    ring.set(withRepeat(withTiming(1, { ...timing('slow', false, 'linear'), duration: 1600 }), -1));
  }, [active, reduced, drop, ring]);

  const banner = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.get() * 1.4),
    transform: [{ translateY: (1 - drop.get()) * -70 }, { scale: 0.94 + drop.get() * 0.06 }],
  }));
  const pulse = useAnimatedStyle(() => ({
    opacity: (1 - ring.get()) * 0.5,
    transform: [{ scale: 1 + ring.get() * 1.6 }],
  }));

  return (
    <View style={styles.center}>
      <View
        style={[
          styles.phone,
          { borderColor: colors.borderStrong, backgroundColor: colors.background },
        ]}
      >
        <Animated.View
          style={[
            styles.banner,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: space[2],
              gap: space[2],
            },
            banner,
          ]}
        >
          <View style={styles.bell}>
            <Animated.View style={[styles.bellRing, { borderColor: colors.ember }, pulse]} />
            <View style={[styles.bellDot, { backgroundColor: colors.ember }]} />
          </View>
          <View style={styles.fill}>
            <Text
              numberOfLines={1}
              style={{ color: colors.text, fontSize: 11, fontWeight: font.weight.bold }}
            >
              Rent due tomorrow
            </Text>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 10 }}>
              Tap to pay
            </Text>
          </View>
        </Animated.View>
        <View style={{ gap: space[2], marginTop: 'auto' }}>
          <View style={[styles.line, { width: '70%', backgroundColor: colors.track }]} />
          <View style={[styles.line, { width: '50%', backgroundColor: colors.track }]} />
          <View style={[styles.line, { width: '84%', backgroundColor: colors.track }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { flex: 1, minHeight: 240, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  segment: { height: 3, borderRadius: 2 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  link: { minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  card: { width: 132, height: 168, borderWidth: StyleSheet.hairlineWidth },
  cardDot: { width: 28, height: 28, borderRadius: 14, marginBottom: 6 },
  cardBar: { height: 44, marginTop: 'auto', opacity: 0.85 },
  line: { height: 7, borderRadius: 4 },
  sheet: { width: '78%', maxWidth: 280, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 196,
    height: 236,
    marginBottom: -48,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 12,
    paddingBottom: 60,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bell: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  bellRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  bellDot: { width: 12, height: 12, borderRadius: 6 },
});
