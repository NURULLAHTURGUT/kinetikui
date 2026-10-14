import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
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
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageDots } from '../../items/page-dots/page-dots';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { timing } from '../../shared/motion/motion';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { glow, minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type PaywallPlan = {
  id: string;
  title: string;
  /** One line under the title. */
  description?: string;
  /** Price charged per period. */
  price: number;
  period: 'week' | 'month' | 'year';
  /** Chip above the title, e.g. "Best value". */
  badge?: string;
  /** Free trial length, shown on the button. */
  trialDays?: number;
};

export type PaywallFeature = {
  key: string;
  title: string;
  body: string;
  /** Art above the title. Defaults to a tilted phone. */
  visual?: ReactNode;
};

export type PaywallProps = {
  /** Charge the plan. Return a promise to show a spinner; reject to stay on the paywall. */
  onPurchase: (plan: PaywallPlan) => Promise<void> | void;
  onClose?: () => void;
  onRestore?: () => void;
  onTerms?: () => void;
  onPrivacy?: () => void;
  /** Product name under the mark. Defaults to "Kinetik Pro". */
  title?: string;
  plans?: readonly PaywallPlan[];
  features?: readonly PaywallFeature[];
  /** Currency symbol placed before prices. Defaults to "$". */
  currency?: string;
  /** Seconds each feature stays before the next slides in. 0 turns it off. Defaults to 4. */
  autoAdvance?: number;
};

const DEFAULT_PLANS: PaywallPlan[] = [
  {
    id: 'annual',
    title: 'Annual Plan',
    description: 'Save the most with a full year of Pro.',
    price: 23.99,
    period: 'year',
    badge: 'Best value',
    trialDays: 3,
  },
  {
    id: 'monthly',
    title: 'Monthly Plan',
    description: 'Every Pro feature, month to month.',
    price: 4.99,
    period: 'month',
  },
];

const DEFAULT_FEATURES: PaywallFeature[] = [
  {
    key: 'widgets',
    title: 'Widgets that move',
    body: 'Live countdowns and progress right on your home screen.',
  },
  {
    key: 'themes',
    title: 'Every theme unlocked',
    body: 'Twelve palettes and icons that follow your style.',
  },
  {
    key: 'sync',
    title: 'Sync on every device',
    body: 'Start on your phone, pick up on your tablet. Always in step.',
  },
];

const PER_MONTH = { week: 52 / 12, month: 1, year: 1 / 12 } as const;
const BILLED = { week: 'weekly', month: 'monthly', year: 'annually' } as const;

/** Plan cards are this share of the screen, so the next one peeks in. */
const CARD_SHARE = 0.82;

/**
 * A subscription screen: a glowing mark, a feature carousel that advances on
 * its own, and plan cards you swipe between, each with its own button.
 */
export function Paywall({
  onPurchase,
  onClose,
  onRestore,
  onTerms,
  onPrivacy,
  title = 'Kinetik Pro',
  plans = DEFAULT_PLANS,
  features = DEFAULT_FEATURES,
  currency = '$',
  autoAdvance = 4,
}: PaywallProps) {
  const { colors, space, font, radius } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [bought, setBought] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const money = (n: number) => `${currency}${n.toFixed(2)}`;
  const top = Math.max(...plans.map((p) => p.price * PER_MONTH[p.period]));

  const purchase = async (plan: PaywallPlan) => {
    setBusy(plan.id);
    try {
      await onPurchase(plan);
      setBought(plan.id);
    } catch {
      // Cancelled or failed: stay on the paywall.
    } finally {
      setBusy(null);
    }
  };

  const link = (label: string, onPress?: () => void) =>
    onPress ? (
      <Pressable key={label} accessibilityRole="link" onPress={onPress} style={styles.link}>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{label}</Text>
      </Pressable>
    ) : null;

  return (
    <View
      style={[styles.fill, { backgroundColor: colors.background }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      testID="paywall"
    >
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[4],
          gap: space[5],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.head, { gap: space[3] }]}>
          <Mark />
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontSize: font.size['2xl'],
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.tight,
            }}
          >
            {title}
          </Text>
        </View>

        {width > 0 ? (
          <Features features={features} width={width} autoAdvance={autoAdvance} />
        ) : null}

        {width > 0 ? (
          <Plans width={width}>
            {plans.map((plan) => {
              const perMonth = plan.price * PER_MONTH[plan.period];
              const off = top > 0 ? Math.round((1 - perMonth / top) * 100) : 0;
              const done = bought === plan.id;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.card,
                    {
                      width: width * CARD_SHARE,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.xl,
                      padding: space[5],
                      gap: space[4],
                    },
                  ]}
                >
                  <View style={{ gap: space[2], alignItems: 'flex-start' }}>
                    {plan.badge ? (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.background, borderRadius: radius.pill },
                        ]}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 11,
                            fontWeight: font.weight.bold,
                            letterSpacing: font.tracking.wide,
                          }}
                        >
                          {plan.badge.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: font.size.xl,
                        fontWeight: font.weight.bold,
                      }}
                    >
                      {plan.title}
                    </Text>
                    {plan.description ? (
                      <Text
                        style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}
                      >
                        {plan.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.rule, { backgroundColor: colors.border }]} />
                  <View
                    accessible
                    accessibilityLabel={`${money(perMonth)} per month, ${money(plan.price)} billed ${BILLED[plan.period]}${off >= 5 ? `, ${off}% off` : ''}`}
                    style={styles.priceRow}
                  >
                    <View style={styles.fill}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: font.size.lg,
                          fontWeight: font.weight.bold,
                        }}
                      >
                        {money(perMonth)}/mth
                      </Text>
                      <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
                        {plan.period === 'month'
                          ? 'Billed monthly'
                          : `${money(plan.price)} billed ${BILLED[plan.period]}`}
                      </Text>
                    </View>
                    {off >= 5 ? (
                      <View
                        style={[
                          styles.off,
                          { backgroundColor: colors.ember, borderRadius: radius.pill },
                        ]}
                      >
                        <Text
                          style={{
                            color: colors.onEmber,
                            fontSize: 11,
                            fontWeight: font.weight.heavy,
                          }}
                        >
                          {off}% OFF
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <PressJelly
                    block
                    variant={done ? 'surface' : 'ember'}
                    loading={busy === plan.id}
                    disabled={busy !== null && busy !== plan.id}
                    onPress={done || busy ? undefined : () => purchase(plan)}
                    accessibilityHint={`Subscribes to the ${plan.title}`}
                  >
                    {done
                      ? 'You’re all set'
                      : plan.trialDays
                        ? `Start trial for ${plan.trialDays} days`
                        : `Subscribe for ${money(plan.price)}`}
                  </PressJelly>
                </View>
              );
            })}
          </Plans>
        ) : null}

        <View style={[styles.links, { gap: space[5] }]}>
          {link('Restore', onRestore)}
          {link('Terms', onTerms)}
          {link('Privacy', onPrivacy)}
        </View>
      </ScrollView>

      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={[styles.close, { top: insets.top + space[2], right: space[3] }]}
        >
          <View style={[styles.cross, { backgroundColor: colors.text }]} />
          <View style={[styles.cross, styles.crossBack, { backgroundColor: colors.text }]} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The product mark: a ring of colour that turns slowly, with a soft glow. */
function Mark() {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(
      reduced
        ? 0
        : withRepeat(withTiming(1, { ...timing('slow', false, 'linear'), duration: 6000 }), -1),
    );
  }, [reduced, turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));

  return (
    <View style={[styles.mark, { boxShadow: glow(colors.azure) }]} aria-hidden>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          gradient(
            `linear-gradient(135deg, ${colors.azure} 0%, ${colors.sky} 45%, ${colors.warning} 100%)`,
          ),
          spin,
        ]}
      />
      <View style={[styles.markHole, { backgroundColor: colors.background }]} />
    </View>
  );
}

function Features({
  features,
  width,
  autoAdvance,
}: {
  features: readonly PaywallFeature[];
  width: number;
  autoAdvance: number;
}) {
  const { colors, space, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const progress = useDerivedValue(() => offset.get() / width);
  const [index, setIndex] = useState(0);
  const dragging = useRef(false);
  const count = features.length;

  const onScroll = useAnimatedScrollHandler((e) => {
    offset.set(e.contentOffset.x);
  });

  const go = (to: number) => {
    scroller.current?.scrollTo({ x: to * width, animated: !reduced });
    setIndex(to);
  };

  // Advance on a timer while nobody is touching it. Reduced motion keeps it still.
  useEffect(() => {
    if (reduced || autoAdvance <= 0 || count < 2) return;
    const id = setTimeout(() => {
      if (dragging.current) return;
      const to = (index + 1) % count;
      scroller.current?.scrollTo({ x: to * width, animated: true });
      setIndex(to);
    }, autoAdvance * 1000);
    return () => clearTimeout(id);
  }, [index, reduced, autoAdvance, count, width, scroller]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={{ gap: space[4] }}>
      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          dragging.current = true;
        }}
        onMomentumScrollEnd={settle}
      >
        {features.map((f, i) => (
          <View
            key={f.key}
            style={[styles.feature, { width, gap: space[2], paddingHorizontal: space[8] }]}
            accessibilityElementsHidden={i !== index}
            importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
          >
            {f.visual ?? <Phone index={i} offset={offset} width={width} />}
            <Text
              style={{
                color: colors.text,
                fontSize: font.size.lg,
                fontWeight: font.weight.bold,
                marginTop: space[3],
              }}
            >
              {f.title}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.sm,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              {f.body}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>
      <PageDots
        count={count}
        index={index}
        progress={progress}
        onPageChange={go}
        variant="expand"
        size={6}
        color={colors.text}
        accessibilityLabel="Feature"
        style={styles.dots}
      />
    </View>
  );
}

const SCREENS = [
  { label: 'In 12 days', title: 'Trip to Lisbon', tone: 'azure' },
  { label: 'Theme', title: 'Midnight', tone: 'ember' },
  { label: 'Synced', title: 'All devices', tone: 'success' },
] as const;

/** A small tilted phone whose screen shows the feature; it swings in as its page arrives. */
function Phone({
  index,
  offset,
  width,
}: {
  index: number;
  offset: SharedValue<number>;
  width: number;
}) {
  const { colors, radius, font } = useKinetikTheme();
  const screen = SCREENS[index % SCREENS.length] ?? SCREENS[0];
  const tone = {
    azure: [colors.azure, colors.sky],
    ember: [colors.surfaceRaised, colors.textSubtle],
    success: [colors.success, colors.azure],
  }[screen.tone];

  const style = useAnimatedStyle(() => {
    const p = offset.get() / width - index;
    return {
      opacity: interpolate(Math.abs(p), [0, 0.7], [1, 0.2], Extrapolation.CLAMP),
      transform: [
        { perspective: 600 },
        { translateX: p * -40 },
        { rotateY: `${-14 + p * 30}deg` },
        { rotateZ: '-8deg' },
      ],
    };
  });

  return (
    <Animated.View
      aria-hidden
      style={[
        styles.phone,
        { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSunken },
        style,
      ]}
    >
      <View style={[styles.notch, { backgroundColor: colors.background }]} />
      <View
        style={[
          styles.screenCard,
          { borderRadius: radius.md },
          gradient(`linear-gradient(160deg, ${tone[0]} 0%, ${tone[1]} 100%)`),
        ]}
      >
        <View
          style={[
            styles.screenScrim,
            gradient(
              `linear-gradient(180deg, ${withAlpha(colors.background, 0)} 30%, ${withAlpha(colors.background, 0.55)} 100%)`,
            ),
          ]}
        />
        <Text style={{ color: colors.highlight, fontSize: 8, fontWeight: font.weight.semibold }}>
          {screen.label}
        </Text>
        <Text style={{ color: colors.highlight, fontSize: 12, fontWeight: font.weight.heavy }}>
          {screen.title}
        </Text>
      </View>
      <View style={[styles.screenLine, { backgroundColor: colors.track }]} />
      <View style={[styles.screenLine, { width: '60%', backgroundColor: colors.track }]} />
    </Animated.View>
  );
}

/** Plan cards in a row that snaps card by card, with the next one peeking in. */
function Plans({ width, children }: { width: number; children: ReactNode[] }) {
  const { space } = useKinetikTheme();
  const card = width * CARD_SHARE;
  const gap = space[3];
  const side = (width - card) / 2;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={card + gap}
      decelerationRate="fast"
      disableIntervalMomentum
      contentContainerStyle={{ paddingHorizontal: side, gap }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { alignItems: 'center' },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markHole: { width: 26, height: 26, borderRadius: 13, marginLeft: 8 },
  close: {
    position: 'absolute',
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    position: 'absolute',
    width: 20,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  crossBack: { transform: [{ rotate: '-45deg' }] },
  feature: { alignItems: 'center' },
  dots: { alignSelf: 'center' },
  phone: {
    width: 104,
    height: 176,
    borderRadius: 20,
    borderWidth: 2,
    padding: 7,
    paddingTop: 18,
    gap: 6,
  },
  notch: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    width: 30,
    height: 7,
    borderRadius: 4,
  },
  screenCard: { height: 96, padding: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  screenScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  screenLine: { height: 6, borderRadius: 3 },
  card: { borderWidth: StyleSheet.hairlineWidth },
  badge: { paddingHorizontal: 10, paddingVertical: 5 },
  rule: { height: StyleSheet.hairlineWidth },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  off: { paddingHorizontal: 10, paddingVertical: 5 },
  links: { flexDirection: 'row', justifyContent: 'center' },
  link: { minHeight: minTouchTarget, justifyContent: 'center' },
});
