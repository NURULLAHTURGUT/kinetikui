import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { DemoIcon } from '../../demo-kit/icons';
import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { BloomMenu } from './bloom-menu';

export const controls = defineControls({
  layout: { type: 'select', label: 'Layout', options: ['column', 'arc'], default: 'column' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const SHOTS: PhotoKey[] = ['mistLake', 'cloudForest', 'snowRidge', 'blueHour'];

export default function BloomMenuDemo({ layout, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  // A new layout starts closed.
  const [shown, setShown] = useState(layout);
  if (shown !== layout) {
    setShown(layout);
    setOpen(false);
  }

  const action = (key: string, label: string, icon: Parameters<typeof DemoIcon>[0]['name']) => ({
    key,
    label,
    icon: <DemoIcon name={icon} color={colors.text} />,
    onPress: () => setLast(label),
  });

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[4],
          gap: space[3],
        },
      ]}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
          Journal
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {last ? `New ${last.toLowerCase()} started` : 'Four entries this week'}
        </Text>
      </View>
      <View style={[styles.grid, { rowGap: space[3] }]}>
        {SHOTS.map((key) => (
          <View key={key} style={styles.cell}>
            <Image
              source={photo(key)}
              style={[styles.shot, { borderRadius: radius.md }]}
              accessibilityLabel={photos[key].title}
            />
            <Text
              numberOfLines={1}
              style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 6 }}
            >
              {photos[key].title}
            </Text>
          </View>
        ))}
      </View>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius.xl, backgroundColor: colors.scrim },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      <BloomMenu
        key={layout}
        layout={layout}
        open={open}
        onOpenChange={setOpen}
        accessibilityLabel="New entry"
        haptics={haptics}
        style={styles.menu}
        actions={[
          action('photo', 'Photo', 'camera'),
          action('note', 'Note', 'pencil'),
          action('voice', 'Voice memo', 'microphone'),
          action('place', 'Place', 'mapPin'),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { borderWidth: StyleSheet.hairlineWidth, height: 440, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '48.5%' },
  shot: { width: '100%', aspectRatio: 1.25 },
  menu: { position: 'absolute', right: 16, bottom: 16 },
});
