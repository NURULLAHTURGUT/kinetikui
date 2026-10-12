import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst, type ConfettiHandle } from '../../items/confetti-burst/confetti-burst';
import { GrainDrift } from '../../items/grain-drift/grain-drift';
import { Odometer } from '../../items/odometer/odometer';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { ShineText } from '../../items/shine-text/shine-text';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type PaywallPlan = {
  id: string;
  title: string;
  /** Price charged per period. */
  price: number;
  period: 'week' | 'month' | 'year';
  /** Short label on the card, e.g. "Save 40%". */
  badge?: string;
  /** Free trial length, shown on the button and in the terms line. */
  trialDays?: number;
};

export type PaywallProps = {
  /** Charge the plan. Return a promise to show a loading state; reject to stay on the paywall. */
  onPurchase: (plan: PaywallPlan) => Promise<void> | void;
  onRestore?: () => void;
  onClose?: () => void;
  onTerms?: () => void;
  onPrivacy?: () => void;
  plans?: readonly PaywallPlan[];
  /** Pre-selected plan. Defaults to the first plan with a badge, else the first. */
  initialPlan?: string;
  title?: string;
  subtitle?: string;
  features?: readonly string[];
  /** Currency symbol placed before prices. Defaults to '$'. */
  currency?: string;
};

const DEFAULT_PLANS: PaywallPlan[] = [
  { id: 'yearly', title: 'Yearly', price: 39.99, period: 'year', badge: 'Save 44%', trialDays: 7 },
  { id: 'monthly', title: 'Monthly', price: 5.99, period: 'month' },
];

const DEFAULT_FEATURES = [
  'Every component and screen template',
  'Updates the day a new SDK ships',
  'Figma kit with matching motion specs',
  'Priority answers from the team',
];

const PER_MONTH = { week: 52 / 12, month: 1, year: 1 / 12 } as const;

/**
 * A subscription screen: a drifting gradient hero, plan cards whose monthly
 * price rolls when you switch, and confetti when the purchase goes through.
 */
export function Paywall({
  onPurchase,
  onRestore,
  onClose,
  onTerms,
  onPrivacy,
  plans = DEFAULT_PLANS,
  initialPlan,
  title = 'Kinetik Pro',
  subtitle = 'Ship motion your users notice, without the weeks of tuning.',
  features = DEFAULT_FEATURES,
  currency = '$',
}: PaywallProps) {
  const { colors, space, font, radius } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const confetti = useRef<ConfettiHandle>(null);
  const [selected, setSelected] = useState(
    () => initialPlan ?? (plans.find((p) => p.badge) ?? plans[0])?.id,
  );
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const plan = plans.find((p) => p.id === selected) ?? plans[0];
  if (!plan) return null;

  const perMonth = plan.price * PER_MONTH[plan.period];
  const money = (n: number) => `${currency}${n.toFixed(2)}`;

  const purchase = async () => {
    setState('busy');
    try {
      await onPurchase(plan);
      setState('done');
      confetti.current?.burst();
    } catch {
      setState('idle');
    }
  };

  const link = (label: string, onPress?: () => void) =>
    onPress ? (
      <Pressable
        accessibilityRole="link"
        onPress={onPress}
        hitSlop={8}
        style={styles.link}
        key={label}
      >
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{label}</Text>
      </Pressable>
    ) : null;

  return (
    <ConfettiBurst ref={confetti} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}
        showsVerticalScrollIndicator={false}
      >
        <GrainDrift style={[styles.hero, { paddingTop: insets.top }]} grain={0.35}>
          {/* Fade into the page so the title reads on any palette. */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              gradient(
                `linear-gradient(180deg, ${withAlpha(colors.background, 0)} 25%, ${withAlpha(colors.background, 0.85)} 80%, ${colors.background} 100%)`,
              ),
            ]}
          />
          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[
                styles.close,
                {
                  top: insets.top + space[2],
                  right: space[3],
                  backgroundColor: withAlpha(colors.surfaceSunken, 0.4),
                  borderRadius: radius.pill,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: font.size.lg, lineHeight: 20 }}>×</Text>
            </Pressable>
          ) : null}
        </GrainDrift>

        {/* The title sits below the gradient rather than over it: two continuously
            redrawn Skia surfaces stacked crashed the Android emulator's GL layer. */}
        <View style={[styles.heroText, { gap: space[2], paddingHorizontal: space[6] }]}>
          <ShineText text={title} fontSize={font.size['4xl']} color={colors.text} />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.md,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View style={{ paddingHorizontal: space[5], gap: space[6], marginTop: space[6] }}>
          <View style={{ gap: space[3] }}>
            {features.map((f) => (
              <View key={f} style={[styles.feature, { gap: space[3] }]}>
                <View
                  style={[
                    styles.check,
                    { backgroundColor: colors.emberSoft, borderRadius: radius.pill },
                  ]}
                >
                  <Text style={{ color: colors.ember, fontSize: font.size.xs, fontWeight: '900' }}>
                    ✓
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontSize: font.size.md, flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>

          <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
            {plans.map((p) => {
              const on = p.id === plan.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: state !== 'idle' }}
                  accessibilityLabel={`${p.title}, ${money(p.price)} per ${p.period}${p.badge ? `, ${p.badge}` : ''}`}
                  disabled={state !== 'idle'}
                  onPress={() => setSelected(p.id)}
                  style={[
                    styles.plan,
                    {
                      borderRadius: radius.lg,
                      padding: space[4],
                      gap: space[3],
                      backgroundColor: on ? colors.emberSoft : colors.surface,
                      borderColor: on ? colors.ember : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[styles.radio, { borderColor: on ? colors.ember : colors.borderStrong }]}
                  >
                    {on ? (
                      <View style={[styles.radioDot, { backgroundColor: colors.ember }]} />
                    ) : null}
                  </View>
                  <View style={styles.fill}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: font.size.md,
                        fontWeight: font.weight.bold,
                      }}
                    >
                      {p.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                      {money(p.price)} / {p.period}
                    </Text>
                  </View>
                  {p.badge ? (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.ember, borderRadius: radius.pill },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.onEmber,
                          fontSize: font.size.xs,
                          fontWeight: font.weight.heavy,
                        }}
                      >
                        {p.badge}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View
            accessible
            accessibilityLabel={`${money(perMonth)} per month`}
            style={[styles.priceRow, { gap: space[1] }]}
          >
            <Odometer
              value={perMonth}
              decimals={2}
              prefix={currency}
              style={{
                color: colors.text,
                fontSize: font.size['3xl'],
                fontWeight: font.weight.heavy,
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: font.size.md, marginBottom: 6 }}>
              / month
            </Text>
          </View>

          <PressJelly
            block
            size="lg"
            variant={state === 'done' ? 'surface' : 'ember'}
            loading={state === 'busy'}
            // Done stays at full contrast (a success, not an unavailable action).
            onPress={state === 'idle' ? purchase : undefined}
            accessibilityHint={`Subscribes to the ${plan.title.toLowerCase()} plan`}
          >
            {state === 'done'
              ? 'You’re in'
              : plan.trialDays
                ? `Start ${plan.trialDays}-day free trial`
                : `Subscribe for ${money(plan.price)}`}
          </PressJelly>

          <Text
            style={{
              color: colors.textSubtle,
              fontSize: font.size.xs,
              lineHeight: 17,
              textAlign: 'center',
            }}
          >
            {plan.trialDays
              ? `Free for ${plan.trialDays} days, then ${money(plan.price)} per ${plan.period}. `
              : `${money(plan.price)} per ${plan.period}. `}
            Renews automatically; cancel anytime in your store settings.
          </Text>

          <View style={[styles.links, { gap: space[4] }]}>
            {link('Restore purchases', onRestore)}
            {link('Terms', onTerms)}
            {link('Privacy', onPrivacy)}
          </View>
        </View>
      </ScrollView>
    </ConfettiBurst>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hero: { height: 240 },
  heroText: { alignItems: 'center' },
  close: {
    position: 'absolute',
    zIndex: 1,
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feature: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  link: { minHeight: minTouchTarget, justifyContent: 'center' },
});
