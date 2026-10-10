import { useRef, useState, type ReactNode } from 'react';
import {
  Platform,
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
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraVeil } from '../../items/aurora-veil/aurora-veil';
import { GlintCard } from '../../items/glint-card/glint-card';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { ScrambleText } from '../../items/scramble-text/scramble-text';
import { TiltDeck, TiltLayer } from '../../items/tilt-deck/tilt-deck';
import { WordCascade } from '../../items/word-cascade/word-cascade';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type OnboardingSlide = {
  key: string;
  /** Small label above the title. */
  eyebrow?: string;
  title: string;
  body: string;
  /** Illustration above the text. Moves with a little parallax while paging. */
  visual?: ReactNode;
};

export type OnboardingFlowProps = {
  /** Called from the last slide's button. */
  onFinish: () => void;
  /** Called by Skip. Defaults to `onFinish`. */
  onSkip?: () => void;
  /** Defaults to three slides about Kinetik; replace with your own. */
  slides?: readonly OnboardingSlide[];
  /** Brand name shown top left. */
  brand?: string;
  /** Defaults to 'Continue'. */
  nextLabel?: string;
  /** Defaults to 'Get started'. */
  finishLabel?: string;
};

/**
 * A paged welcome flow over an aurora background: each title cascades in as
 * its slide arrives, illustrations drift with the swipe and the progress
 * pill stretches between dots.
 */
export function OnboardingFlow({
  onFinish,
  onSkip = onFinish,
  slides: slidesProp,
  brand = 'Kinetik',
  nextLabel = 'Continue',
  finishLabel = 'Get started',
}: OnboardingFlowProps) {
  const { colors, space, font, radius } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const defaults = useDefaultSlides();
  const slides = slidesProp ?? defaults;

  const scroller = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const widthRef = useRef(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    offset.set(e.contentOffset.x);
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = widthRef.current;
    if (w > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  const last = index === slides.length - 1;
  const goNext = () => {
    if (last) return onFinish();
    const next = index + 1;
    scroller.current?.scrollTo({ x: next * widthRef.current, animated: true });
    setIndex(next);
  };

  return (
    <AuroraVeil style={styles.fill} intensity={0.55}>
      <View
        style={[styles.fill, { paddingTop: insets.top + space[2], paddingBottom: insets.bottom }]}
        onLayout={onLayout}
        testID="onboarding-root"
      >
        <View style={[styles.topBar, { paddingHorizontal: space[5] }]}>
          <View style={styles.brand}>
            <View
              style={[
                styles.brandDot,
                { backgroundColor: colors.ember, boxShadow: `0px 0px 10px ${colors.ember}` },
              ]}
            />
            <Text
              style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.heavy }}
            >
              {brand}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            accessibilityElementsHidden={last}
            importantForAccessibility={last ? 'no-hide-descendants' : 'auto'}
            disabled={last}
            onPress={onSkip}
            hitSlop={8}
            style={[styles.skip, { opacity: last ? 0 : 1, borderRadius: radius.pill }]}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
              }}
            >
              Skip
            </Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={settle}
          style={styles.fill}
        >
          {width > 0 &&
            slides.map((slide, i) => (
              <Page
                key={slide.key}
                slide={slide}
                index={i}
                width={width}
                offset={offset}
                active={i === index}
              />
            ))}
        </Animated.ScrollView>

        <View style={{ paddingHorizontal: space[5], paddingBottom: space[4], gap: space[5] }}>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Step ${index + 1} of ${slides.length}`}
            style={[styles.dots, { gap: space[1.5] }]}
          >
            {slides.map((s, i) => (
              <Dot key={s.key} index={i} offset={offset} width={width} />
            ))}
          </View>
          <PressJelly block size="lg" onPress={goNext}>
            {last ? finishLabel : nextLabel}
          </PressJelly>
        </View>
      </View>
    </AuroraVeil>
  );
}

function Page({
  slide,
  index,
  width,
  offset,
  active,
}: {
  slide: OnboardingSlide;
  index: number;
  width: number;
  offset: SharedValue<number>;
  active: boolean;
}) {
  const { colors, space, font } = useKinetikTheme();

  // The illustration lags the page by a third, so it seems to sit further back.
  const visualStyle = useAnimatedStyle(() => {
    const progress = offset.get() / width - index;
    return {
      opacity: interpolate(Math.abs(progress), [0, 0.9], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: progress * width * 0.35 }],
    };
  });

  return (
    <View
      style={[styles.page, { width, paddingHorizontal: space[6], gap: space[8] }]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[styles.visual, visualStyle]}>{slide.visual}</Animated.View>
      <View style={{ gap: space[3] }}>
        {slide.eyebrow ? (
          <Text
            style={{
              color: colors.ember,
              fontSize: font.size.xs,
              fontWeight: font.weight.bold,
              letterSpacing: 1.6,
            }}
          >
            {slide.eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <WordCascade
          text={slide.title}
          replayKey={active ? `on-${index}` : 'off'}
          animateOnMount={index === 0}
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.heavy,
            letterSpacing: -1,
            lineHeight: 42,
          }}
        />
        <Text style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 24 }}>
          {slide.body}
        </Text>
      </View>
    </View>
  );
}

function Dot({
  index,
  offset,
  width,
}: {
  index: number;
  offset: SharedValue<number>;
  width: number;
}) {
  const { colors, radius } = useKinetikTheme();
  const style = useAnimatedStyle(() => {
    const d = width > 0 ? Math.abs(offset.get() / width - index) : index;
    const t = interpolate(d, [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 8 + 18 * t, opacity: 0.35 + 0.65 * t };
  });
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: colors.text, borderRadius: radius.pill }, style]}
    />
  );
}

function useDefaultSlides(): OnboardingSlide[] {
  const { colors, space, font, radius } = useKinetikTheme();
  return [
    {
      key: 'explain',
      eyebrow: 'Motion with a purpose',
      title: 'Interfaces that move like they mean it.',
      body: 'Every transition shows where something came from and where it went, so people never lose their place.',
      visual: (
        <TiltDeck accessibilityLabel="Album card" contentStyle={{ padding: 0 }} style={styles.card}>
          <View
            style={[
              styles.art,
              gradient(
                `linear-gradient(145deg, ${colors.ember} 0%, ${withAlpha(colors.ember, 0.3)} 50%, ${colors.surfaceSunken} 100%)`,
              ),
            ]}
          >
            <TiltLayer
              depth={-0.6}
              style={[styles.sun, { backgroundColor: withAlpha(colors.highlight, 0.24) }]}
            />
            <TiltLayer depth={0.7} style={[styles.hill, { backgroundColor: colors.surface }]} />
          </View>
          <TiltLayer depth={0.4} style={{ padding: space[4], gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}
            >
              Press a corner
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Layers shift at their own depth
            </Text>
          </TiltLayer>
        </TiltDeck>
      ),
    },
    {
      key: 'physical',
      eyebrow: 'Feels physical',
      title: 'Light, weight and a little give.',
      body: 'Springs instead of timers, a glint that follows your finger, haptics only where they carry meaning.',
      visual: (
        <GlintCard style={styles.card} contentStyle={{ padding: space[5], gap: space[6] }}>
          <View style={styles.passRow}>
            <View
              style={[styles.passDot, { borderColor: colors.ember, borderRadius: radius.pill }]}
            />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.xs,
                fontWeight: font.weight.bold,
                letterSpacing: 2,
              }}
            >
              MEMBER
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: font.size['2xl'],
                fontWeight: font.weight.heavy,
              }}
            >
              Drag across me
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              or tilt your phone
            </Text>
          </View>
        </GlintCard>
      ),
    },
    {
      key: 'yours',
      eyebrow: 'Yours to change',
      title: 'Copied into your app, not hidden in a package.',
      body: 'One command adds the source and installs matching native versions. Edit anything.',
      visual: (
        <View
          style={[
            styles.card,
            styles.terminal,
            {
              backgroundColor: colors.surfaceSunken,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: space[5],
              gap: space[3],
            },
          ]}
        >
          <View style={[styles.passRow, { gap: space[1.5], justifyContent: 'flex-start' }]}>
            {[colors.danger, colors.warning, colors.success].map((c) => (
              <View key={c} style={[styles.light, { backgroundColor: withAlpha(c, 0.8) }]} />
            ))}
          </View>
          <ScrambleText
            text="npx kinetik-ui add glint-card"
            style={{ color: colors.text, fontSize: font.size.sm, fontFamily: MONO }}
          />
          <Text style={{ color: colors.success, fontSize: font.size.sm, fontFamily: MONO }}>
            ✓ components/kinetik/glint-card.tsx
          </Text>
        </View>
      ),
    },
  ];
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    height: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 10, height: 10, borderRadius: 5 },
  skip: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: { flex: 1, justifyContent: 'center' },
  visual: { alignItems: 'center' },
  card: { width: '100%', maxWidth: 340 },
  art: { height: 150, overflow: 'hidden' },
  sun: { position: 'absolute', width: 80, height: 80, borderRadius: 40, top: 26, left: 40 },
  hill: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -50,
    bottom: -170,
    transform: [{ scaleX: 2.2 }],
  },
  passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passDot: { width: 22, height: 22, borderWidth: 6 },
  terminal: { borderWidth: StyleSheet.hairlineWidth },
  light: { width: 10, height: 10, borderRadius: 5 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 8 },
  dot: { height: 8 },
});
