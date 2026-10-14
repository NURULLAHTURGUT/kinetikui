import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { palettes, withAlpha } from '../../shared/tokens/tokens';

export type NowPlayingTrack = {
  id: string;
  title: string;
  /** Line under the title: the artist, or the piece. */
  subtitle: string;
  cover: ImageSourcePropType;
  /** Length in seconds. */
  duration: number;
};

export type NowPlayingProps = {
  tracks: readonly NowPlayingTrack[];
  /** Start playing at once. Defaults to false. */
  autoPlay?: boolean;
  /** Called with the track that starts. */
  onTrackChange?: (track: NowPlayingTrack) => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Colour of the progress and the play button. Defaults to amber orange. */
  accent?: string;
  /** A tick on each control. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Player icons from Tabler Icons (MIT, https://tabler.io/icons), via iconstack.io.
const ICONS = {
  play: 'M7 4v16l13 -8z',
  pause:
    'M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z',
  next: 'M3 5v14l8 -7z M14 5v14l8 -7z',
  prev: 'M21 5v14l-8 -7z M10 5v14l-8 -7z',
};

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

/** "1:09" for elapsed time. */
export function clock(seconds: number, pad = false): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${pad ? String(m).padStart(2, '0') : m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Playback state for a single track: a 0–1 progress shared value that runs
 * on the UI thread while playing, and the elapsed seconds as text (updated a
 * few times a second, never per frame).
 */
function usePlayback(duration: number, playing: boolean, track: string, onEnd: () => void) {
  const progress = useSharedValue(0);
  const [elapsed, setElapsed] = useState(0);
  const [seeks, setSeeks] = useState(0);
  const ended = useRef(onEnd);
  useEffect(() => {
    ended.current = onEnd;
  });

  // A new track starts from the top: the readout resets during render, the bar in an effect.
  const [current, setCurrent] = useState(track);
  if (current !== track) {
    setCurrent(track);
    setElapsed(0);
  }
  useEffect(() => {
    cancelAnimation(progress);
    progress.set(0);
  }, [track, progress]);

  useEffect(() => {
    if (!playing || duration <= 0) {
      cancelAnimation(progress);
      return;
    }
    const from = progress.get();
    progress.set(
      withTiming(1, { duration: Math.max(0, (1 - from) * duration * 1000), easing: Easing.linear }),
    );
    const id = setInterval(() => {
      const p = progress.get();
      setElapsed(Math.floor(p * duration));
      if (p >= 1) ended.current();
    }, 250);
    return () => {
      clearInterval(id);
      cancelAnimation(progress);
    };
  }, [playing, duration, track, seeks, progress]);

  const seek = (share: number) => {
    const p = Math.max(0, Math.min(1, share));
    cancelAnimation(progress);
    progress.set(p);
    setElapsed(Math.floor(p * duration));
    setSeeks((n) => n + 1);
  };

  return { progress, elapsed, seek };
}

/**
 * A dark now-playing widget: the cover glows into the card, the title is set
 * in a serif, and the progress runs on the UI thread. Play springs the cover
 * forward and morphs the icon; skipping slides the next cover in.
 */
export function NowPlaying({
  tracks,
  autoPlay = false,
  onTrackChange,
  onPlayingChange,
  accent = 'hsl(28, 96%, 54%)',
  haptics = true,
  style,
}: NowPlayingProps) {
  const { radius, space, font } = useKinetikTheme();
  // A dark widget on either theme, like a lock-screen player.
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [width, setWidth] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const track = tracks[index];

  const go = (to: number) => {
    const next = (to + tracks.length) % tracks.length;
    setIndex(next);
    const t = tracks[next];
    if (t) onTrackChange?.(t);
  };
  const { progress, elapsed, seek } = usePlayback(
    track?.duration ?? 0,
    playing,
    track?.id ?? '',
    () => go(index + 1),
  );

  const lift = useSharedValue(playing ? 1 : 0);
  useEffect(() => {
    lift.set(reduced ? (playing ? 1 : 0) : withSpring(playing ? 1 : 0, spring('bouncy')));
  }, [playing, reduced, lift]);
  const swap = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    swap.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, timing('slow'))));
  }, [index, reduced, swap]);

  const art = useAnimatedStyle(() => ({
    opacity: 0.35 + swap.get() * 0.65,
    transform: [
      { translateX: (1 - swap.get()) * 18 },
      { scale: (0.94 + lift.get() * 0.06) * (0.96 + swap.get() * 0.04) },
    ],
  }));
  const words = useAnimatedStyle(() => ({
    opacity: swap.get(),
    transform: [{ translateY: (1 - swap.get()) * 8 }],
  }));
  // A transform, not a width, so the bar never asks for layout while it plays.
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));

  if (!track) return null;
  const cover = width > 0 ? Math.min(150, width * 0.38) : 120;

  const toggle = () => {
    haptic('tap');
    setPlaying(!playing);
    onPlayingChange?.(!playing);
  };
  const back = () => {
    haptic('tick');
    if (elapsed > 3) seek(0);
    else go(index - 1);
  };
  const ahead = () => {
    haptic('tick');
    go(index + 1);
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.card,
        {
          borderRadius: radius.xl + 4,
          padding: space[4],
          gap: space[5],
          borderColor: colors.border,
        },
        gradient(
          `linear-gradient(105deg, hsl(30, 32%, 20%) 0%, ${colors.background} 48%, ${colors.background} 100%)`,
        ),
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.cover,
          {
            width: cover,
            height: cover,
            borderRadius: radius.xl - 6,
            boxShadow: '0px 10px 30px hsla(30, 40%, 30%, 0.45)',
          },
          art,
        ]}
      >
        <Image
          source={track.cover}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      <View style={[styles.grow, { gap: space[4] }]}>
        <Animated.View
          style={words}
          accessible
          accessibilityLabel={`${track.title}, ${track.subtitle}`}
        >
          <Text
            numberOfLines={1}
            style={{
              color: colors.highlight,
              fontFamily: SERIF,
              fontSize: font.size['2xl'],
              fontWeight: font.weight.bold,
            }}
          >
            {track.title}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: font.size.sm + 1 }}>
            {track.subtitle}
          </Text>
        </Animated.View>

        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Playback position"
            accessibilityValue={{
              min: 0,
              max: track.duration,
              now: elapsed,
              text: `${clock(elapsed)} of ${clock(track.duration)}`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              const step = 10 / track.duration;
              const now = elapsed / track.duration;
              seek(now + (e.nativeEvent.actionName === 'increment' ? step : -step));
            }}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            onPress={(e: GestureResponderEvent) =>
              barWidth > 0 && seek(e.nativeEvent.locationX / barWidth)
            }
            style={styles.barHit}
          >
            <View style={[styles.bar, { backgroundColor: withAlpha(colors.text, 0.16) }]}>
              <Animated.View style={[styles.barFill, { backgroundColor: accent }, fill]} />
            </View>
          </Pressable>
          <View style={styles.times}>
            <Text style={[styles.time, { color: colors.textMuted }]}>{clock(elapsed)}</Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>
              -{clock(track.duration - elapsed, true)}
            </Text>
          </View>
        </View>

        <View style={[styles.controls, { gap: space[2] }]}>
          <Control label="Previous" icon={ICONS.prev} onPress={back} tone={colors.surfaceRaised} />
          <PlayButton playing={playing} onPress={toggle} tone={accent} />
          <Control label="Next" icon={ICONS.next} onPress={ahead} tone={colors.surfaceRaised} />
        </View>
      </View>
    </View>
  );
}

function Control({
  label,
  icon,
  onPress,
  tone,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  tone: string;
}) {
  const ink = palettes.dark.highlight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d={icon} fill={ink} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** Play and pause cross-fade and turn, so the icon seems to morph. */
function PlayButton({
  playing,
  onPress,
  tone,
}: {
  playing: boolean;
  onPress: () => void;
  tone: string;
}) {
  const reduced = useReduceMotion();
  const on = useSharedValue(playing ? 1 : 0);
  useEffect(() => {
    on.set(reduced ? (playing ? 1 : 0) : withSpring(playing ? 1 : 0, spring('snappy')));
  }, [playing, reduced, on]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Glyph icon={ICONS.play} on={on} show={0} />
      <Glyph icon={ICONS.pause} on={on} show={1} />
    </Pressable>
  );
}

function Glyph({ icon, on, show }: { icon: string; on: SharedValue<number>; show: 0 | 1 }) {
  const ink = palettes.dark.highlight;
  const style = useAnimatedStyle(() => {
    const v = show ? on.get() : 1 - on.get();
    return {
      opacity: v,
      transform: [{ scale: 0.6 + v * 0.4 }, { rotate: `${(1 - v) * (show ? -90 : 90)}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.glyph, style]}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d={icon} fill={ink} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
  cover: { overflow: 'hidden' },
  grow: { flex: 1, minWidth: 0 },
  // 44 pt to touch, with the extra height taken back so the bar keeps its place.
  barHit: { height: 44, marginVertical: -13, justifyContent: 'center' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, width: '100%', transformOrigin: 'left center' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontSize: 13, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row' },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { position: 'absolute' },
});
