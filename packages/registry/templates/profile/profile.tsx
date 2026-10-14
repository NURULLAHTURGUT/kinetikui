import { useEffect, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressJelly } from '../../items/press-jelly/press-jelly';
import { PulseToggle } from '../../items/pulse-toggle/pulse-toggle';
import { durations, easings, timing } from '../../shared/motion/motion';
import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type ProfileUser = {
  name: string;
  /** Line under the name, e.g. "@ada" or an email. */
  handle?: string;
  avatar?: ImageSourcePropType;
};

export type ProfileStat = { label: string; value: number };

export type ProfileRow = {
  key: string;
  label: string;
  /** Icon in the rounded tile at the start of the row. */
  icon?: ReactNode;
  /** Quiet text before the chevron, e.g. "English". */
  detail?: string;
  onPress?: () => void;
  /** Makes the row a switch instead of a link. */
  toggle?: { value: boolean; onValueChange: (value: boolean) => void };
};

export type ProfileSection = { title?: string; rows: readonly ProfileRow[] };

export type ProfileProps = {
  user: ProfileUser;
  stats?: readonly ProfileStat[];
  /** A highlighted card under the stats, e.g. the current subscription. */
  plan?: { title: string; detail?: string; onPress?: () => void };
  sections?: readonly ProfileSection[];
  onEdit?: () => void;
  /** Adds a Sign out row at the end. */
  onSignOut?: () => void;
};

const DEFAULT_SECTIONS: ProfileSection[] = [
  {
    title: 'Account',
    rows: [
      { key: 'info', label: 'Personal info' },
      { key: 'security', label: 'Password and security' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { key: 'help', label: 'Help center' },
      { key: 'privacy', label: 'Privacy' },
    ],
  },
];

/** 1,234 stays as is; larger counts shorten to 12.4k and 1.2M. */
export function compactCount(n: number): string {
  if (n < 10_000) return Math.round(n).toLocaleString('en-US');
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * A profile and settings screen: an avatar inside a slowly turning ring,
 * stats that count up, an optional plan card and grouped rows with links and
 * switches, all settling in from the top.
 */
export function Profile({
  user,
  stats = [],
  plan,
  sections = DEFAULT_SECTIONS,
  onEdit,
  onSignOut,
}: ProfileProps) {
  const { colors, space, font, radius } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();

  const enter = (step: number) =>
    reduced
      ? undefined
      : FadeInDown.delay(80 + step * 70)
          .duration(durations.slow)
          .easing(easings.standard);

  const all: ProfileSection[] = onSignOut
    ? [...sections, { rows: [{ key: 'sign-out', label: 'Sign out', onPress: onSignOut }] }]
    : [...sections];

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + space[8],
        paddingBottom: insets.bottom + space[8],
        paddingHorizontal: space[5],
        gap: space[6],
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={enter(0)} style={[styles.head, { gap: space[3] }]}>
        <Avatar user={user} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontSize: font.size.xl,
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.tight,
            }}
          >
            {user.name}
          </Text>
          {user.handle ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{user.handle}</Text>
          ) : null}
        </View>
        {onEdit ? (
          <PressJelly variant="surface" onPress={onEdit} style={styles.center}>
            Edit profile
          </PressJelly>
        ) : null}
      </Animated.View>

      {stats.length > 0 ? (
        <Animated.View
          entering={enter(1)}
          style={[
            styles.stats,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingVertical: space[4],
            },
          ]}
        >
          {stats.map((s, i) => (
            <View key={s.label} style={styles.statSlot}>
              {i > 0 ? (
                <View style={[styles.statRule, { backgroundColor: colors.border }]} />
              ) : null}
              <Stat stat={s} />
            </View>
          ))}
        </Animated.View>
      ) : null}

      {plan ? (
        <Animated.View entering={enter(2)}>
          <Pressable
            accessibilityRole={plan.onPress ? 'button' : undefined}
            accessibilityLabel={[plan.title, plan.detail].filter(Boolean).join(', ')}
            onPress={plan.onPress}
            disabled={!plan.onPress}
            style={[
              styles.plan,
              { borderRadius: radius.lg, padding: space[4], gap: space[3] },
              gradient(`linear-gradient(120deg, ${colors.azure} 0%, ${colors.sky} 100%)`),
            ]}
          >
            <View style={styles.fill}>
              <Text
                style={{
                  color: colors.onAzure,
                  fontSize: font.size.md,
                  fontWeight: font.weight.bold,
                }}
              >
                {plan.title}
              </Text>
              {plan.detail ? (
                <Text style={{ color: colors.onAzure, fontSize: font.size.sm, opacity: 0.85 }}>
                  {plan.detail}
                </Text>
              ) : null}
            </View>
            {plan.onPress ? <Chevron color={colors.onAzure} /> : null}
          </Pressable>
        </Animated.View>
      ) : null}

      {all.map((section, i) => (
        <Animated.View
          key={section.title ?? `section-${i}`}
          entering={enter(3 + i)}
          style={{ gap: space[2] }}
        >
          {section.title ? (
            <Text
              accessibilityRole="header"
              style={{
                color: colors.textSubtle,
                fontSize: font.size.xs,
                fontWeight: font.weight.semibold,
                letterSpacing: font.tracking.wide,
                marginLeft: space[1],
              }}
            >
              {section.title.toUpperCase()}
            </Text>
          ) : null}
          <View
            style={[
              styles.group,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
            ]}
          >
            {section.rows.map((row, j) => (
              <Row key={row.key} row={row} first={j === 0} danger={row.key === 'sign-out'} />
            ))}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

/** The photo or initials inside a ring of colour that turns slowly. */
function Avatar({ user }: { user: ProfileUser }) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(
      reduced
        ? 0
        : withRepeat(withTiming(1, { ...timing('slow', false, 'linear'), duration: 8000 }), -1),
    );
  }, [reduced, turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <View style={styles.avatarSlot} aria-hidden>
      <View style={styles.ring}>
        <Animated.View
          style={[
            styles.ringFill,
            gradient(
              `linear-gradient(135deg, ${colors.azure} 0%, ${colors.sky} 35%, ${colors.success} 70%, ${colors.warning} 100%)`,
            ),
            spin,
          ]}
        />
      </View>
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.background },
        ]}
      >
        {user.avatar ? (
          <Image source={user.avatar} style={styles.photo} />
        ) : (
          <Text
            style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}
          >
            {initials}
          </Text>
        )}
      </View>
    </View>
  );
}

function Stat({ stat }: { stat: ProfileStat }) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const shown = useCountUp(stat.value, { instant: reduced, duration: 1100 });
  return (
    <View
      accessible
      accessibilityLabel={`${compactCount(stat.value)} ${stat.label}`}
      style={styles.stat}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: font.size.lg,
          fontWeight: font.weight.bold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {compactCount(shown)}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{stat.label}</Text>
    </View>
  );
}

function Row({ row, first, danger }: { row: ProfileRow; first: boolean; danger: boolean }) {
  const { colors, space, font, radius } = useKinetikTheme();
  const ink = danger ? colors.danger : colors.text;

  const content = (
    <>
      {row.icon ? (
        <View
          style={[styles.tile, { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm }]}
        >
          {row.icon}
        </View>
      ) : null}
      <Text style={[styles.fill, { color: ink, fontSize: font.size.md }]}>{row.label}</Text>
      {row.detail ? (
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>{row.detail}</Text>
      ) : null}
    </>
  );

  const frame = [
    styles.row,
    {
      gap: space[3],
      paddingHorizontal: space[4],
      borderTopColor: colors.border,
      borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
    },
  ];

  if (row.toggle) {
    return (
      <View style={frame}>
        {content}
        <PulseToggle
          size="sm"
          value={row.toggle.value}
          onValueChange={row.toggle.onValueChange}
          accessibilityLabel={row.label}
          style={styles.center}
        />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={row.detail}
      onPress={row.onPress}
      disabled={!row.onPress}
      style={({ pressed }) => [...frame, pressed && { backgroundColor: colors.surfaceSunken }]}
    >
      {content}
      {danger ? null : <Chevron color={colors.textSubtle} />}
    </Pressable>
  );
}

/** A right-pointing chevron drawn with two borders. */
function Chevron({ color }: { color: string }) {
  return <View style={[styles.chevron, { borderColor: color }]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { alignItems: 'center' },
  center: { alignSelf: 'center' },
  avatarSlot: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 52, overflow: 'hidden' },
  ringFill: { position: 'absolute', top: -12, right: -12, bottom: -12, left: -12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  stats: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth },
  statSlot: { flex: 1, flexDirection: 'row' },
  statRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  plan: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  group: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  tile: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginRight: 4,
  },
});
