import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ElasticSlider } from '../../items/elastic-slider/elastic-slider';
import { MorphSheet } from '../../items/morph-sheet/morph-sheet';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { PulseToggle } from '../../items/pulse-toggle/pulse-toggle';
import { ScrambleText } from '../../items/scramble-text/scramble-text';
import { TiltDeck, TiltLayer } from '../../items/tilt-deck/tilt-deck';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Length in seconds. */
  duration: number;
  /** Cover tone. Defaults to the theme accents. */
  tone?: 'ember' | 'ice';
};

export type PlayerSheetProps = {
  tracks?: readonly Track[];
  /** Title above the list. */
  title?: string;
  /** Called with the track that should start playing. Wire this to your audio player. */
  onPlay?: (track: Track) => void;
  onPause?: () => void;
  /** Called when the user scrubs, in seconds. */
  onSeek?: (seconds: number) => void;
  /**
   * Playback position in seconds, from your audio player. Without it the
   * screen advances its own clock while playing, which is enough for a demo.
   */
  position?: number;
};

const DEFAULT_TRACKS: Track[] = [
  { id: '1', title: 'Glass Harbour', artist: 'Lumen Fields', duration: 214, tone: 'ice' },
  { id: '2', title: 'Low Tide', artist: 'Lumen Fields', duration: 187, tone: 'ember' },
  { id: '3', title: 'Northbound', artist: 'Kestrel Sound', duration: 242, tone: 'ice' },
  { id: '4', title: 'Static Bloom', artist: 'Paper Moons', duration: 198, tone: 'ember' },
  { id: '5', title: 'Afterimage', artist: 'Kestrel Sound', duration: 225, tone: 'ice' },
  { id: '6', title: 'Long Exposure', artist: 'Paper Moons', duration: 263, tone: 'ember' },
];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * A music library with a mini player that opens into a full player sheet:
 * a tilting cover, a scrambling title on track change and an elastic scrubber.
 */
export function PlayerSheet({
  tracks = DEFAULT_TRACKS,
  title = 'Library',
  onPlay,
  onPause,
  onSeek,
  position: positionProp,
}: PlayerSheetProps) {
  const { colors, space, font, radius } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  // Track and position change together (auto-advance), so they share one state.
  const [now, setNow] = useState({ index: 0, position: 0 });
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const { index } = now;
  const position = positionProp ?? now.position;
  const track = tracks[index];

  // Stand-in clock for when no audio player drives `position`.
  useEffect(() => {
    if (!playing || positionProp !== undefined) return;
    const t = setInterval(() => {
      setNow((n) => {
        const length = tracks[n.index]?.duration ?? 0;
        return n.position + 1 < length
          ? { ...n, position: n.position + 1 }
          : { index: (n.index + 1) % tracks.length, position: 0 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, positionProp, tracks]);

  if (!track) return null;

  const play = (i: number) => {
    const next = tracks[i];
    if (!next) return;
    setNow({ index: i, position: 0 });
    setPlaying(true);
    onPlay?.(next);
  };
  const toggle = () => {
    if (playing) {
      setPlaying(false);
      onPause?.();
    } else {
      setPlaying(true);
      onPlay?.(track);
    }
  };
  const step = (dir: 1 | -1) => {
    if (dir === -1 && position > 3) {
      setNow((n) => ({ ...n, position: 0 }));
      onSeek?.(0);
      return;
    }
    const pick = shuffle
      ? (index + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
      : (index + dir + tracks.length) % tracks.length;
    play(pick);
  };

  const sheet = (
    <View style={{ paddingHorizontal: space[6], gap: space[6], paddingBottom: space[6] }}>
      <Cover track={track} large />
      <View style={{ gap: space[1] }}>
        <ScrambleText
          text={track.title}
          replayKey={track.id}
          animateOnMount={false}
          style={{ color: colors.text, fontSize: font.size['2xl'], fontWeight: font.weight.heavy }}
        />
        <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{track.artist}</Text>
      </View>
      <View style={{ gap: space[1] }}>
        <ElasticSlider
          label="Position"
          value={Math.min(position, track.duration)}
          min={0}
          max={track.duration}
          step={1}
          showLabel={false}
          formatValue={clock}
          onSlidingComplete={(v) => {
            setNow((n) => ({ ...n, position: v }));
            onSeek?.(v);
          }}
        />
        <View style={styles.times}>
          <Text style={[styles.time, { color: colors.textSubtle, fontSize: font.size.xs }]}>
            {clock(position)}
          </Text>
          <Text style={[styles.time, { color: colors.textSubtle, fontSize: font.size.xs }]}>
            −{clock(Math.max(0, track.duration - position))}
          </Text>
        </View>
      </View>
      <View style={[styles.transport, { gap: space[3] }]}>
        <PressJelly variant="surface" accessibilityLabel="Previous track" onPress={() => step(-1)}>
          {'\u23EE\uFE0E'}
        </PressJelly>
        <View style={styles.fill}>
          <PressJelly
            block
            size="lg"
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            onPress={toggle}
          >
            {playing ? 'Pause' : 'Play'}
          </PressJelly>
        </View>
        <PressJelly variant="surface" accessibilityLabel="Next track" onPress={() => step(1)}>
          {'\u23ED\uFE0E'}
        </PressJelly>
      </View>
      <PulseToggle
        label="Shuffle"
        description="Play the library in a random order"
        value={shuffle}
        onValueChange={setShuffle}
      />
    </View>
  );

  return (
    <MorphSheet
      open={open}
      onOpenChange={setOpen}
      snapPoints={[0.62, 0.94]}
      initialSnap={1}
      accessibilityLabel="Now playing"
      sheet={sheet}
    >
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + space[6],
            paddingHorizontal: space[5],
            paddingBottom: 96 + insets.bottom,
            gap: space[1],
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontSize: font.size['3xl'],
              fontWeight: font.weight.heavy,
              letterSpacing: -1,
              marginBottom: space[4],
            }}
          >
            {title}
          </Text>
          {tracks.map((t, i) => {
            const current = i === index;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`${t.title} by ${t.artist}, ${clock(t.duration)}`}
                accessibilityState={{ selected: current }}
                onPress={() => play(i)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    gap: space[3],
                    borderRadius: radius.md,
                    paddingHorizontal: space[2],
                    backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
                  },
                ]}
              >
                <Cover track={t} />
                <View style={styles.fill}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: current ? colors.ember : colors.text,
                      fontSize: font.size.md,
                      fontWeight: font.weight.semibold,
                    }}
                  >
                    {t.title}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                    {t.artist}
                  </Text>
                </View>
                <Text style={[styles.time, { color: colors.textSubtle, fontSize: font.size.sm }]}>
                  {clock(t.duration)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${track.title} by ${track.artist}`}
          accessibilityHint="Opens the player"
          onPress={() => setOpen(true)}
          style={[
            styles.mini,
            {
              bottom: insets.bottom + space[3],
              left: space[3],
              right: space[3],
              gap: space[3],
              padding: space[2],
              paddingRight: space[3],
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              boxShadow: `0px 12px 32px ${withAlpha(colors.surfaceSunken, 0.6)}`,
            },
          ]}
        >
          <Cover track={track} />
          <View style={styles.fill}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {track.title}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {track.artist}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            onPress={toggle}
            hitSlop={6}
            style={[
              styles.miniButton,
              { backgroundColor: colors.ember, borderRadius: radius.pill },
            ]}
          >
            <Text style={{ color: colors.onEmber, fontSize: font.size.md, fontWeight: '900' }}>
              {playing ? '\u275A\u275A' : '\u25B6\uFE0E'}
            </Text>
          </Pressable>
          {/* Progress hairline along the bottom edge. */}
          <View style={[styles.progressTrack, { backgroundColor: colors.track }]}>
            <View
              style={{
                width: `${Math.min(100, (position / track.duration) * 100)}%`,
                height: '100%',
                backgroundColor: colors.ember,
              }}
            />
          </View>
        </Pressable>
      </View>
    </MorphSheet>
  );
}

function Cover({ track, large = false }: { track: Track; large?: boolean }) {
  const { colors, radius } = useKinetikTheme();
  const tone = track.tone === 'ember' ? colors.ember : colors.ice;
  const other = track.tone === 'ember' ? colors.ice : colors.ember;
  const art = (
    <View
      style={[
        large ? styles.coverLarge : styles.coverSmall,
        { borderRadius: large ? 0 : radius.sm, overflow: 'hidden' },
        gradient(
          `linear-gradient(150deg, ${tone} 0%, ${withAlpha(other, 0.45)} 55%, ${colors.surfaceSunken} 100%)`,
        ),
      ]}
    >
      {large ? (
        <>
          <TiltLayer
            depth={-0.5}
            style={[styles.orb, { backgroundColor: withAlpha(colors.highlight, 0.22) }]}
          />
          <TiltLayer
            depth={0.8}
            style={[styles.ridge, { backgroundColor: withAlpha(colors.surfaceSunken, 0.7) }]}
          />
        </>
      ) : null}
    </View>
  );
  if (!large) return art;
  return (
    <TiltDeck accessibilityLabel={`${track.title} cover`} contentStyle={{ padding: 0 }}>
      {art}
    </TiltDeck>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  time: { fontVariant: ['tabular-nums'] },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  transport: { flexDirection: 'row', alignItems: 'center' },
  mini: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  miniButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  coverSmall: { width: 48, height: 48 },
  coverLarge: { width: '100%', aspectRatio: 1 },
  orb: { position: 'absolute', width: 120, height: 120, borderRadius: 60, top: '18%', left: '16%' },
  ridge: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    bottom: -300,
    left: -40,
    transform: [{ scaleX: 1.6 }],
  },
});
