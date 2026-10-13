import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { LiftMenu } from './lift-menu';

export const controls = defineControls({
  delay: { type: 'number', label: 'Hold (ms)', min: 250, max: 700, step: 50, default: 380 },
});

const ALBUM: PhotoKey[] = ['cloudForest', 'nightPeak', 'pastelTide', 'blueHour'];

export default function LiftMenuDemo({ delay }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [note, setNote] = useState('Press and hold a photo.');
  const [pinned, setPinned] = useState<PhotoKey | null>(null);

  return (
    <View style={{ gap: space[3] }}>
      <View style={styles.grid}>
        {ALBUM.map((key) => (
          <LiftMenu
            key={key}
            delay={delay}
            accessibilityLabel={`${photos[key].title}, ${photos[key].place}`}
            onPress={() => setNote(`Opened ${photos[key].title}.`)}
            style={styles.cell}
            actions={[
              {
                key: 'pin',
                label: pinned === key ? 'Unpin' : 'Pin to top',
                icon: (c) => <DemoIcon name="bookmark" color={c} size={18} />,
                onPress: () => setPinned((p) => (p === key ? null : key)),
              },
              {
                key: 'share',
                label: 'Share',
                icon: (c) => <DemoIcon name="share" color={c} size={18} />,
                onPress: () => setNote(`Shared ${photos[key].title}.`),
              },
              {
                key: 'delete',
                label: 'Delete',
                destructive: true,
                icon: (c) => <DemoIcon name="trash" color={c} size={18} />,
                onPress: () => setNote(`Deleted ${photos[key].title} (not really).`),
              },
            ]}
          >
            <View
              style={[styles.tile, { borderRadius: radius.lg, backgroundColor: colors.surface }]}
            >
              <Image source={photo(key)} style={styles.image} accessibilityIgnoresInvertColors />
              <View style={[styles.caption, { padding: space[3] }]}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.sm,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {photos[key].title}
                </Text>
                {pinned === key ? (
                  <DemoIcon name="bookmark" color={colors.azure} size={14} />
                ) : null}
              </View>
            </View>
          </LiftMenu>
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48%', flexGrow: 1 },
  tile: { overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1 },
  caption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
