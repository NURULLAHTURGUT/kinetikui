import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GrainDrift } from '../grain-drift';
import { LiquidTabs } from '../liquid-tabs';
import { Odometer } from '../odometer';
import { ParallaxHeader } from '../parallax-header';
import { PressJelly } from '../press-jelly';
import { Skeleton, SkeletonGroup } from '../skeleton-sweep';
import { ToastProvider, useToast } from '../toast-stack';
import { gradient } from '../../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../../lib/kinetik/tokens/tokens';

export type ProfileTabKey = 'posts' | 'liked' | 'about';

export type Profile = {
  name: string;
  handle: string;
  bio?: string;
  stats: { posts: number; followers: number; following: number };
  /** Label/value rows for the About tab. */
  about?: readonly { label: string; value: string }[];
};

export type ProfileHeroProps = {
  profile?: Profile;
  following?: boolean;
  onFollowChange?: (following: boolean) => void;
  onMessage?: () => void;
  /** Load a tab's content. Skeletons show until the promise settles. */
  loadTab?: (tab: ProfileTabKey) => Promise<void>;
  /** Replace a tab's content. Defaults to a gradient grid (posts, liked) and the about rows. */
  renderTab?: (tab: ProfileTabKey) => ReactNode;
  /** Top safe-area inset for the collapsed bar. Defaults to the device inset. */
  topInset?: number;
};

const DEFAULT_PROFILE: Profile = {
  name: 'Mira Okafor',
  handle: '@mira',
  bio: 'Motion designer in Lisbon. Making interfaces feel like they were built with hands.',
  stats: { posts: 128, followers: 24816, following: 312 },
  about: [
    { label: 'Based in', value: 'Lisbon, Portugal' },
    { label: 'Studio', value: 'Field Notes' },
    { label: 'Joined', value: 'March 2021' },
    { label: 'Website', value: 'mira.studio' },
  ],
};

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'liked', label: 'Liked' },
  { key: 'about', label: 'About' },
] as const;

/**
 * A profile screen: a drifting cover that parallaxes away, a follow button
 * whose count rolls, liquid tabs and skeletons while a tab loads.
 */
export function ProfileHero(props: ProfileHeroProps) {
  return (
    <ToastProvider placement="bottom">
      <ProfileScreen {...props} />
    </ToastProvider>
  );
}

function ProfileScreen({
  profile = DEFAULT_PROFILE,
  following: followingProp,
  onFollowChange,
  onMessage,
  loadTab,
  renderTab,
  topInset,
}: ProfileHeroProps) {
  const { colors, space, font } = useKinetikTheme();
  const toast = useToast();
  const [followingState, setFollowing] = useState(false);
  const following = followingProp ?? followingState;
  const [tab, setTab] = useState<ProfileTabKey>('posts');
  const [loading, setLoading] = useState<ProfileTabKey | null>(loadTab ? 'posts' : null);

  useEffect(() => {
    if (!loadTab) return;
    let live = true;
    loadTab(tab)
      .catch(() => {})
      .finally(() => live && setLoading(null));
    return () => {
      live = false;
    };
  }, [tab, loadTab]);

  const changeTab = (key: string) => {
    if (loadTab) setLoading(key as ProfileTabKey);
    setTab(key as ProfileTabKey);
  };

  const first = profile.name.split(' ')[0] ?? profile.name;
  const setFollow = (next: boolean) => {
    setFollowing(next);
    onFollowChange?.(next);
  };
  const toggleFollow = () => {
    const next = !following;
    setFollow(next);
    if (next) {
      toast.show({
        title: `Following ${first}`,
        description: 'Their posts will show up in your feed.',
        tone: 'success',
        action: { label: 'Undo', onPress: () => setFollow(false) },
      });
    }
  };

  const stats = [
    { label: 'Posts', value: profile.stats.posts },
    { label: 'Followers', value: profile.stats.followers + (following ? 1 : 0) },
    { label: 'Following', value: profile.stats.following },
  ];

  return (
    <ParallaxHeader
      title={profile.name}
      subtitle={profile.handle}
      headerHeight={320}
      topInset={topInset}
      header={
        <GrainDrift style={StyleSheet.absoluteFill} grain={0.4}>
          <View
            style={[
              StyleSheet.absoluteFill,
              gradient(
                `linear-gradient(180deg, ${withAlpha(colors.background, 0)} 35%, ${withAlpha(colors.background, 0.7)} 75%, ${colors.background} 100%)`,
              ),
            ]}
          />
        </GrainDrift>
      }
    >
      <View style={{ paddingHorizontal: space[5], gap: space[5], paddingBottom: space[10] }}>
        {profile.bio ? (
          <Text style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 23 }}>
            {profile.bio}
          </Text>
        ) : null}

        <View style={[styles.row, { gap: space[3] }]}>
          <View style={styles.fill}>
            <PressJelly
              block
              variant={following ? 'surface' : 'ember'}
              onPress={toggleFollow}
              accessibilityLabel={following ? `Following ${first}` : `Follow ${first}`}
              accessibilityHint={following ? 'Unfollows' : undefined}
            >
              {following ? 'Following' : 'Follow'}
            </PressJelly>
          </View>
          {onMessage ? (
            <View style={styles.fill}>
              <PressJelly block variant="surface" onPress={onMessage}>
                Message
              </PressJelly>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.row,
            styles.stats,
            { borderColor: colors.border, paddingVertical: space[4] },
          ]}
        >
          {stats.map((s) => (
            <View
              key={s.label}
              accessible
              accessibilityLabel={`${s.value.toLocaleString('en-US')} ${s.label.toLowerCase()}`}
              style={styles.stat}
            >
              <Odometer
                value={s.value}
                locale="en-US"
                containerStyle={styles.statValue}
                style={{
                  color: colors.text,
                  fontSize: font.size.xl,
                  fontWeight: font.weight.heavy,
                }}
              />
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <LiquidTabs
          accessibilityLabel="Profile sections"
          tabs={TABS}
          value={tab}
          onChange={changeTab}
        />

        {loading === tab ? (
          <TabSkeleton tab={tab} />
        ) : renderTab ? (
          renderTab(tab)
        ) : tab === 'about' ? (
          <About rows={profile.about ?? []} />
        ) : (
          <Grid seed={tab === 'posts' ? 0 : 5} />
        )}
      </View>
    </ParallaxHeader>
  );
}

function TabSkeleton({ tab }: { tab: ProfileTabKey }) {
  const { space, radius } = useKinetikTheme();
  if (tab === 'about') {
    return (
      <SkeletonGroup accessibilityLabel="Loading details" style={{ gap: space[4] }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ gap: space[1.5] }}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="60%" height={16} />
          </View>
        ))}
      </SkeletonGroup>
    );
  }
  return (
    <SkeletonGroup accessibilityLabel="Loading posts" style={{ gap: space[2] }}>
      {ROWS.map((row) => (
        <View key={row} style={[styles.gridRow, { gap: space[2] }]}>
          {COLS.map((col) => (
            <View key={col} style={styles.cell}>
              <Skeleton height="100%" radius={radius.md} />
            </View>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

// Explicit rows: Yoga leaves aspectRatio cells with a percentage width at zero
// height inside a wrapping row, so the grid is built from flex rows instead.
const ROWS = [0, 1, 2];
const COLS = [0, 1, 2];

function Grid({ seed }: { seed: number }) {
  const { colors, space, radius } = useKinetikTheme();
  const tones = [colors.ember, colors.ice, colors.success, colors.warning];
  return (
    <View style={{ gap: space[2] }}>
      {ROWS.map((row) => (
        <View key={row} style={[styles.gridRow, { gap: space[2] }]}>
          {COLS.map((col) => {
            const i = row * COLS.length + col;
            const a = tones[(i + seed) % tones.length]!;
            const b = tones[(i * 3 + seed + 1) % tones.length]!;
            return (
              <View
                key={col}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Post ${i + 1}`}
                style={[
                  styles.cell,
                  { borderRadius: radius.md, overflow: 'hidden' },
                  gradient(
                    `linear-gradient(${35 + i * 40}deg, ${withAlpha(a, 0.85)} 0%, ${withAlpha(b, 0.35)} 100%)`,
                  ),
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function About({ rows }: { rows: readonly { label: string; value: string }[] }) {
  const { colors, space, font } = useKinetikTheme();
  return (
    <View>
      {rows.map((r, i) => (
        <View
          key={r.label}
          accessible
          style={[
            styles.aboutRow,
            {
              paddingVertical: space[3],
              borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{r.label}</Text>
          <Text style={{ color: colors.text, fontSize: font.size.md }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stats: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { alignSelf: 'center' },
  gridRow: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 1 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
