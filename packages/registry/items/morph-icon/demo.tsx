import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { photo } from '../../demo-kit/photos';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { MorphIcon } from './morph-icon';

export const controls = defineControls({
  variant: {
    type: 'select',
    label: 'Play button',
    options: ['solid', 'soft', 'ghost'],
    default: 'solid',
  },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

/** Length of the demo track, in seconds. */
const LENGTH = 214;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function MorphIconDemo({ variant, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [menu, setMenu] = useState(false);

  // The track plays only while playing: a second at a time, the line gliding between ticks.
  const [elapsed, setElapsed] = useState(68);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed((s) => (s >= LENGTH ? 0 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [playing]);
  const at = useSharedValue(elapsed / LENGTH);
  useEffect(() => {
    at.set(withTiming(elapsed / LENGTH, { duration: 1000, easing: Easing.linear }));
  }, [elapsed, at]);
  const bar = useAnimatedStyle(() => ({ width: `${at.get() * 100}%` }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[4],
          gap: space[4],
        },
      ]}
    >
      <View style={[styles.row, { gap: space[3] }]}>
        <Image
          source={photo('nightPeak')}
          style={[styles.cover, { borderRadius: radius.md }]}
          accessibilityLabel="Album cover: a mountain under the night sky"
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
          >
            Night Peak
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            Ambient for focus
          </Text>
        </View>
        <MorphIcon
          pair="menu-close"
          variant="ghost"
          accessibilityLabel="More options"
          value={menu}
          onValueChange={setMenu}
          haptics={haptics}
        />
      </View>

      <View style={{ gap: space[2] }}>
        <View style={[styles.track, { backgroundColor: colors.track }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.azure }, bar]} />
        </View>
        <View style={styles.times}>
          <Text style={[styles.time, { color: colors.textSubtle, fontSize: font.size.xs }]}>
            {clock(elapsed)}
          </Text>
          <Text style={[styles.time, { color: colors.textSubtle, fontSize: font.size.xs }]}>
            {clock(LENGTH)}
          </Text>
        </View>
      </View>

      <View style={[styles.row, styles.controls]}>
        <MorphIcon
          pair="plus-check"
          accessibilityLabel="Save to library"
          value={saved}
          onValueChange={setSaved}
          haptics={haptics}
        />
        <MorphIcon
          pair="play-pause"
          variant={variant}
          size={64}
          accessibilityLabel="Play"
          activeAccessibilityLabel="Pause"
          value={playing}
          onValueChange={setPlaying}
          haptics={haptics}
        />
        <MorphIcon pair="plus-close" accessibilityLabel="Add to queue" haptics={haptics} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  cover: { width: 56, height: 56 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontVariant: ['tabular-nums'] },
  controls: { justifyContent: 'space-evenly' },
});
