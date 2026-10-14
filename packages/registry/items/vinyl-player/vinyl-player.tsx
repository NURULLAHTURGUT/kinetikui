import { useEffect, useRef, useState } from 'react';
import {
  Image,
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type VinylTrack = {
  id: string;
  title: string;
  artist: string;
  cover: ImageSourcePropType;
  /** Length in seconds. */
  duration: number;
};

export type VinylPlayerProps = {
  tracks: readonly VinylTrack[];
  /** Start playing at once. Defaults to false. */
  autoPlay?: boolean;
  onTrackChange?: (track: VinylTrack) => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Called when the mute button is toggled. Without it there is no mute button. */
  onMutedChange?: (muted: boolean) => void;
  /** Colour of the progress. Defaults to the theme azure. */
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
  volume:
    'M15 8a5 5 0 0 1 0 8 M17.7 5a9 9 0 0 1 0 14 M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5',
  muted:
    'M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5 M16 10l4 4m0 -4l-4 4',
};

const DISC = 132;
/** One full turn of the record, in ms. */
const TURN = 6000;

/**
 * Playback state for one track: a 0–1 progress that runs on the UI thread
 * while playing, and whole seconds for the readout.
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

function mmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * A light music card with the cover as a record half out of its sleeve: it
 * spins while the track plays and coasts to a stop on pause. The pressed
 * control flashes a ring, the mute icon pops between states, and a new track
 * drops its record in with a little turn.
 */
export function VinylPlayer({
  tracks,
  autoPlay = false,
  onTrackChange,
  onPlayingChange,
  onMutedChange,
  accent,
  haptics = true,
  style,
}: VinylPlayerProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const track = tracks[index];
  const tone = accent ?? colors.azure;

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

  // The record keeps its angle between plays, so pausing never snaps it back.
  const angle = useSharedValue(0);
  useEffect(() => {
    if (!playing || reduced) {
      const at = angle.get();
      cancelAnimation(angle);
      // Coast a little further, like a platter slowing down.
      if (!reduced && at > 0)
        angle.set(withTiming(at + 24, { duration: 700, easing: Easing.out(Easing.quad) }));
      return;
    }
    // Each loop runs a full turn from the current angle, so the repeat never shows a jump.
    const from = angle.get() % 360;
    angle.set(from);
    angle.set(withRepeat(withTiming(from + 360, { duration: TURN, easing: Easing.linear }), -1));
    return () => cancelAnimation(angle);
  }, [playing, reduced, angle]);

  const drop = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    drop.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, spring('smooth'))));
  }, [index, reduced, drop]);

  const record = useAnimatedStyle(() => ({
    opacity: 0.4 + drop.get() * 0.6,
    transform: [
      { translateX: (1 - drop.get()) * -24 },
      { rotate: `${angle.get() - (1 - drop.get()) * 60}deg` },
    ],
  }));
  // A transform, not a width, so the bar never asks for layout while it plays.
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));

  if (!track) return null;

  const press = (fn: () => void) => () => {
    haptic('tick');
    fn();
  };

  return (
    <View style={[styles.host, style]}>
      <View
        style={[
          styles.card,
          {
            marginLeft: DISC * 0.5,
            paddingLeft: DISC * 0.5 + space[4],
            paddingRight: space[4],
            paddingVertical: space[4],
            borderRadius: radius.xl - 4,
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            boxShadow: shadow.lg,
          },
        ]}
      >
        <View style={styles.head}>
          <View
            accessible
            accessibilityLabel={`${track.title}, ${track.artist}`}
            style={styles.grow}
          >
            <Text
              numberOfLines={1}
              style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.medium }}
            >
              {track.title}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
              {track.artist}
            </Text>
          </View>
          {onMutedChange ? (
            <MuteButton
              muted={muted}
              onPress={() => {
                haptic('tap');
                setMuted(!muted);
                onMutedChange(!muted);
              }}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Playback position"
          accessibilityValue={{
            min: 0,
            max: track.duration,
            now: elapsed,
            text: `${mmss(elapsed)} of ${mmss(track.duration)}`,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const step = 10 / track.duration;
            seek(
              elapsed / track.duration + (e.nativeEvent.actionName === 'increment' ? step : -step),
            );
          }}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          onPress={(e: GestureResponderEvent) =>
            barWidth > 0 && seek(e.nativeEvent.locationX / barWidth)
          }
          style={[styles.barHit, { marginTop: space[3] - 14 }]}
        >
          <View style={[styles.bar, { backgroundColor: colors.track }]}>
            <Animated.View style={[styles.barFill, { backgroundColor: tone }, fill]} />
          </View>
        </Pressable>

        <View style={[styles.controls, { marginTop: space[2] }]}>
          <RingButton
            label="Previous"
            icon={ICONS.prev}
            onPress={press(() => (elapsed > 3 ? seek(0) : go(index - 1)))}
          />
          <RingButton
            label={playing ? 'Pause' : 'Play'}
            icon={playing ? ICONS.pause : ICONS.play}
            onPress={press(() => {
              setPlaying(!playing);
              onPlayingChange?.(!playing);
            })}
          />
          <RingButton label="Next" icon={ICONS.next} onPress={press(() => go(index + 1))} />
        </View>
      </View>

      <View pointerEvents="none" style={[styles.discSlot, { width: DISC, height: DISC }]}>
        <Animated.View
          style={[
            styles.disc,
            { width: DISC, height: DISC, borderRadius: DISC / 2, boxShadow: shadow.lg },
            record,
          ]}
        >
          <Image
            source={track.cover}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          {/* Grooves and the spindle hole, so the turn reads even on a plain cover. */}
          <View
            style={[
              styles.groove,
              { inset: DISC * 0.16, borderColor: withAlpha(colors.highlight, 0.18) },
            ]}
          />
          <View
            style={[
              styles.groove,
              { inset: DISC * 0.3, borderColor: withAlpha(colors.highlight, 0.14) },
            ]}
          />
          <View
            style={[
              styles.hole,
              { backgroundColor: colors.highlight, borderColor: withAlpha(colors.text, 0.2) },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

/** A round control whose ring flashes out when pressed. */
function RingButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const flash = useSharedValue(0);
  const ring = useAnimatedStyle(() => ({
    opacity: flash.get(),
    transform: [{ scale: 0.7 + flash.get() * 0.3 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (!reduced) {
          flash.set(withSequence(withTiming(1, timing('quick')), withTiming(0, timing('slow'))));
        }
        onPress();
      }}
      style={({ pressed }) => [styles.round, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
    >
      <Animated.View
        style={[
          styles.ring,
          { borderColor: colors.borderStrong, backgroundColor: withAlpha(colors.text, 0.05) },
          ring,
        ]}
      />
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d={icon}
          fill={colors.text}
          stroke={colors.text}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function MuteButton({ muted, onPress }: { muted: boolean; onPress: () => void }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!reduced)
      pop.set(withSequence(withTiming(0.6, { duration: 0 }), withSpring(1, spring('bouncy'))));
  }, [muted, reduced, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Mute"
      accessibilityState={{ checked: muted }}
      onPress={onPress}
      style={styles.round}
    >
      <Animated.View style={style}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d={muted ? ICONS.muted : ICONS.volume}
            stroke={colors.textSubtle}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: { justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0, paddingTop: 2 },
  // 44 pt to touch, with the extra height taken back so the bar keeps its place.
  barHit: { height: 44, marginVertical: -14, justifyContent: 'center' },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, width: '100%', transformOrigin: 'left center' },
  controls: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -8 },
  round: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
  discSlot: { position: 'absolute', left: 0, alignSelf: 'center' },
  disc: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  groove: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  hole: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
});
