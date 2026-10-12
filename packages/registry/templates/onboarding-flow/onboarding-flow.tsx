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
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraVeil } from '../../items/aurora-veil/aurora-veil';
import { GlintCard } from '../../items/glint-card/glint-card';
import { ScrambleText } from '../../items/scramble-text/scramble-text';
import { TiltDeck, TiltLayer } from '../../items/tilt-deck/tilt-deck';
import { WordCascade } from '../../items/word-cascade/word-cascade';
import { gradient } from '../../shared/tokens/gradient';
import { spring } from '../../shared/motion/motion';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, palettes, withAlpha } from '../../shared/tokens/tokens';

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
  /** Accessible name of the round next button. Defaults to 'Continue'. */
  nextLabel?: string;
  /** Label of the last slide's button. Defaults to 'Get started'. */
  finishLabel?: string;
};

/** Size of the round next button. */
const BUTTON = 56;

/**
 * A paged welcome flow. Each illustration sits under a soft spotlight and
 * drifts with the swipe, titles cascade in as their slide arrives, progress
 * fills like stories, and the round next button grows into "Get started" on
 * the last slide.
 */
export function OnboardingFlow({
  onFinish,
  onSkip = onFinish,
  slides: slidesProp,
  brand = 'Kinetik',
  nextLabel = 'Continue',
  finishLabel = 'Get started',
}: OnboardingFlowProps) {
  const { colors, space, font, scheme } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const defaults = useDefaultSlides();
  const slides = slidesProp ?? defaults;
  const count = slides.length;

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

  const last = index === count - 1;
  const goNext = () => {
    if (last) return onFinish();
    const next = index + 1;
    scroller.current?.scrollTo({ x: next * widthRef.current, animated: true });
    setIndex(next);
  };

  const pad = space[6];
  const footer = Math.max(BUTTON, width - pad * 2);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* On a light ground the aurora is ink, so it is kept faint there. */}
      <AuroraVeil style={StyleSheet.absoluteFill} intensity={scheme === 'dark' ? 0.4 : 0.12} />
      {/* The aurora fades out behind the text so the copy sits on a clean ground. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          gradient(
            `linear-gradient(180deg, ${withAlpha(colors.background, 0)} 0%, ${withAlpha(colors.background, 0.4)} 40%, ${colors.background} 68%)`,
          ),
        ]}
      />
      <View
        style={[styles.fill, { paddingTop: insets.top + space[2], paddingBottom: insets.bottom }]}
        onLayout={onLayout}
        testID="onboarding-root"
      >
        <View style={[styles.topBar, { paddingHorizontal: pad }]}>
          <View style={styles.brand}>
            <View style={styles.mark}>
              <View style={[styles.markRing, { borderColor: colors.text }]} />
              <View style={[styles.markDot, { backgroundColor: colors.text }]} />
            </View>
            <Text
              style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}
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
            style={[styles.skip, { opacity: last ? 0 : 1 }]}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: font.weight.medium,
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
                count={count}
                width={width}
                offset={offset}
                active={i === index}
              />
            ))}
        </Animated.ScrollView>

        <View style={[styles.footer, { marginHorizontal: pad, marginBottom: space[5] }]}>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Step ${index + 1} of ${count}`}
            style={styles.segments}
          >
            {slides.map((s, i) => (
              <Segment key={s.key} index={i} count={count} offset={offset} width={width} />
            ))}
          </View>
          <NextButton
            offset={offset}
            width={width}
            count={count}
            full={footer}
            label={last ? finishLabel : nextLabel}
            finishLabel={finishLabel}
            onPress={goNext}
          />
        </View>
      </View>
    </View>
  );
}

/** How far the last slide has arrived, 0–1. */
function arrival(offset: number, width: number, count: number) {
  'worklet';
  if (count <= 1) return 1;
  if (width <= 0) return 0;
  return interpolate(offset / width, [count - 2, count - 1], [0, 1], Extrapolation.CLAMP);
}

/**
 * A round arrow button that widens into a labelled pill as the last slide
 * arrives, and gives a little under the finger.
 */
function NextButton({
  offset,
  width,
  count,
  full,
  label,
  finishLabel,
  onPress,
}: {
  offset: SharedValue<number>;
  width: number;
  count: number;
  full: number;
  label: string;
  finishLabel: string;
  onPress: () => void;
}) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pressed = useSharedValue(0);

  const shell = useAnimatedStyle(() => {
    const t = arrival(offset.get(), width, count);
    return {
      width: BUTTON + (full - BUTTON) * t,
      transform: [{ scale: 1 - pressed.get() * 0.04 }],
    };
  });
  const arrow = useAnimatedStyle(() => {
    const t = arrival(offset.get(), width, count);
    return { opacity: 1 - Math.min(1, t * 2.5), transform: [{ translateX: t * 24 }] };
  });
  const text = useAnimatedStyle(() => {
    const t = arrival(offset.get(), width, count);
    return { opacity: Math.max(0, t * 2 - 1), transform: [{ scale: 0.92 + t * 0.08 }] };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
      style={styles.buttonSlot}
    >
      <Animated.View
        style={[styles.button, { backgroundColor: colors.ember, borderRadius: radius.pill }, shell]}
      >
        <Animated.View style={[styles.center, arrow]}>
          <View style={[styles.arrowStem, { backgroundColor: colors.onEmber }]} />
          <View style={[styles.arrowHead, { borderColor: colors.onEmber }]} />
        </Animated.View>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.center,
            styles.finish,
            { color: colors.onEmber, fontSize: font.size.md, fontWeight: font.weight.bold },
            text,
          ]}
        >
          {finishLabel}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function Page({
  slide,
  index,
  count,
  width,
  offset,
  active,
}: {
  slide: OnboardingSlide;
  index: number;
  count: number;
  width: number;
  offset: SharedValue<number>;
  active: boolean;
}) {
  const { colors, space, font } = useKinetikTheme();

  // The illustration lags the page, so it seems to sit further back.
  const visualStyle = useAnimatedStyle(() => {
    const progress = offset.get() / width - index;
    return {
      opacity: interpolate(Math.abs(progress), [0, 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: progress * width * 0.45 },
        { scale: interpolate(Math.abs(progress), [0, 1], [1, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });
  // The copy fades a little faster than it moves.
  const copyStyle = useAnimatedStyle(() => {
    const progress = offset.get() / width - index;
    return { opacity: interpolate(Math.abs(progress), [0, 0.6], [1, 0], Extrapolation.CLAMP) };
  });

  return (
    <View
      style={[styles.page, { width, paddingHorizontal: space[6] }]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <View style={styles.stage}>
        {/* A soft spotlight the illustration stands in. */}
        <View
          pointerEvents="none"
          style={[styles.spot, { boxShadow: `0px 0px 120px 90px ${colors.emberSoft}` }]}
        />
        <Animated.View style={[styles.visual, visualStyle]}>{slide.visual}</Animated.View>
      </View>
      <Animated.View style={[{ gap: space[3], paddingBottom: space[6] }, copyStyle]}>
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: font.size.xs,
            fontWeight: font.weight.semibold,
            letterSpacing: 1.4,
            fontVariant: ['tabular-nums'],
          }}
        >
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          {slide.eyebrow ? `   ·   ${slide.eyebrow.toUpperCase()}` : ''}
        </Text>
        <WordCascade
          text={slide.title}
          replayKey={active ? `on-${index}` : 'off'}
          animateOnMount={index === 0}
          style={{
            color: colors.text,
            fontSize: 34,
            fontWeight: font.weight.bold,
            letterSpacing: -1.2,
            lineHeight: 38,
          }}
        />
        <Text style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 24 }}>
          {slide.body}
        </Text>
      </Animated.View>
    </View>
  );
}

/** One story-style progress bar; fills as its slide arrives. */
function Segment({
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
  const { colors, radius } = useKinetikTheme();
  const fill = useAnimatedStyle(() => {
    const t = width > 0 ? offset.get() / width - index + 1 : index === 0 ? 1 : 0;
    return { width: `${Math.max(0, Math.min(1, t)) * 100}%` };
  });
  const hide = useAnimatedStyle(() => ({
    opacity: 1 - arrival(offset.get(), width, count),
  }));
  return (
    <Animated.View
      style={[
        styles.segment,
        { backgroundColor: withAlpha(colors.text, 0.14), borderRadius: radius.pill },
        hide,
      ]}
    >
      <Animated.View style={[styles.segmentFill, { backgroundColor: colors.text }, fill]} />
    </Animated.View>
  );
}

function useDefaultSlides(): OnboardingSlide[] {
  const { colors, space, font, radius, shadow } = useKinetikTheme();
  return [
    {
      key: 'explain',
      eyebrow: 'Motion with a purpose',
      title: 'Interfaces that move like they mean it.',
      body: 'Every transition shows where something came from and where it went, so people never lose their place.',
      visual: (
        <View style={styles.fan}>
          {/* Two more cards stacked behind, peeking over the top, for depth. */}
          {[2, 1].map((level) => (
            <View
              key={level}
              style={[
                styles.stacked,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderStrong,
                  borderRadius: radius.lg,
                  opacity: 1 - level * 0.3,
                  transform: [{ translateY: -14 * level }, { scale: 1 - level * 0.06 }],
                },
              ]}
            />
          ))}
          <TiltDeck
            accessibilityLabel="Album card"
            contentStyle={{ padding: 0 }}
            radius={radius.lg}
            style={[styles.card, { boxShadow: shadow.lg }]}
          >
            <View
              style={[
                styles.art,
                gradient(
                  `linear-gradient(160deg, ${withAlpha(colors.ember, 0.9)} 0%, ${withAlpha(colors.ember, 0.25)} 45%, ${colors.surfaceSunken} 100%)`,
                ),
              ]}
            >
              <TiltLayer
                depth={-0.6}
                style={[styles.sun, { backgroundColor: withAlpha(colors.highlight, 0.3) }]}
              />
              <TiltLayer depth={0.7} style={[styles.hill, { backgroundColor: colors.surface }]} />
            </View>
            <TiltLayer depth={0.4} style={{ padding: space[4], gap: 2 }}>
              <Text
                style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}
              >
                Press a corner
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                Layers shift at their own depth
              </Text>
            </TiltLayer>
          </TiltDeck>
        </View>
      ),
    },
    {
      key: 'physical',
      eyebrow: 'Feels physical',
      title: 'Light, weight and a little give.',
      body: 'Springs instead of timers, a glint that follows your finger, haptics only where they carry meaning.',
      visual: (
        <GlintCard
          glintColor={colors.highlight}
          radius={18}
          intensity={0.85}
          style={[styles.card, styles.metal, gradient(METAL), { boxShadow: shadow.lg }]}
          contentStyle={{ flex: 1, padding: space[5], justifyContent: 'space-between' }}
        >
          <View style={styles.row}>
            <Text style={[styles.metalText, { fontSize: 12, fontWeight: '800', letterSpacing: 3 }]}>
              KINETIK
            </Text>
            <Text style={[styles.metalText, { fontSize: 11, opacity: 0.6, letterSpacing: 1.6 }]}>
              MEMBER
            </Text>
          </View>
          <View style={[styles.chip, gradient(CHIP)]} />
          <View style={{ gap: 2 }}>
            <Text style={[styles.metalText, { fontSize: font.size.lg, fontWeight: '700' }]}>
              Drag across me
            </Text>
            <Text style={[styles.metalText, { fontSize: font.size.sm, opacity: 0.6 }]}>
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
              borderColor: colors.borderStrong,
              borderRadius: radius.lg,
              boxShadow: shadow.lg,
            },
          ]}
        >
          <View
            style={[
              styles.terminalBar,
              { borderColor: colors.border, paddingHorizontal: space[4] },
            ]}
          >
            {[0.9, 0.6, 0.35].map((a) => (
              <View
                key={a}
                style={[styles.light, { backgroundColor: withAlpha(colors.text, a * 0.5) }]}
              />
            ))}
            <Text style={[styles.terminalTitle, { color: colors.textSubtle }]}>my-app</Text>
          </View>
          <View style={{ padding: space[4], gap: space[2] }}>
            <View style={styles.prompt}>
              <Text style={{ color: colors.textSubtle, fontSize: font.size.sm, fontFamily: MONO }}>
                ${' '}
              </Text>
              <ScrambleText
                text="npx kinetik-ui add glint-card"
                style={{ color: colors.text, fontSize: font.size.sm, fontFamily: MONO }}
              />
            </View>
            {[
              'components/kinetik/glint-card.tsx',
              'lib/kinetik/tokens.ts',
              '2 native packages',
            ].map((line) => (
              <Text
                key={line}
                numberOfLines={1}
                style={{ color: colors.textMuted, fontSize: font.size.xs, fontFamily: MONO }}
              >
                <Text style={{ color: colors.success }}>✓ </Text>
                {line}
              </Text>
            ))}
          </View>
        </View>
      ),
    },
  ];
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
// The member card is black metal on either theme, so it always uses the dark palette.
const METAL_INK = palettes.dark;
const METAL = `linear-gradient(135deg, ${METAL_INK.surfaceRaised} 0%, ${METAL_INK.surface} 45%, ${METAL_INK.background} 72%, ${METAL_INK.skeleton} 100%)`;
const CHIP = `linear-gradient(140deg, ${METAL_INK.text} 0%, ${METAL_INK.textSubtle} 45%, ${METAL_INK.textMuted} 70%, ${METAL_INK.textSubtle} 100%)`;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    height: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 22, height: 14, justifyContent: 'center' },
  markRing: {
    position: 'absolute',
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  markDot: { position: 'absolute', left: 8, width: 14, height: 14, borderRadius: 7 },
  skip: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  page: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spot: { position: 'absolute', width: 1, height: 1, top: '50%', left: '50%' },
  visual: { width: '100%', alignItems: 'center' },
  card: { width: '100%', maxWidth: 300 },
  fan: { width: '100%', maxWidth: 300, alignItems: 'center' },
  stacked: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  art: { height: 150, overflow: 'hidden' },
  sun: { position: 'absolute', width: 72, height: 72, borderRadius: 36, top: 28, left: 40 },
  hill: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -50,
    bottom: -170,
    transform: [{ scaleX: 2.2 }],
  },
  metal: { aspectRatio: 1.586, borderColor: METAL_INK.borderStrong },
  metalText: { color: METAL_INK.text },
  chip: { width: 40, height: 30, borderRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prompt: { flexDirection: 'row', alignItems: 'center' },
  terminal: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  terminalBar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  terminalTitle: { flex: 1, textAlign: 'center', marginRight: 42, fontSize: 12, fontFamily: MONO },
  light: { width: 10, height: 10, borderRadius: 5 },
  footer: {
    height: BUTTON,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segment: { width: 28, height: 3, overflow: 'hidden' },
  segmentFill: { height: '100%' },
  buttonSlot: { position: 'absolute', right: 0, top: 0 },
  button: { height: BUTTON, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  finish: { left: 0, right: 0, textAlign: 'center' },
  arrowStem: { width: 18, height: 2, borderRadius: 1 },
  arrowHead: {
    position: 'absolute',
    right: 0,
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});
