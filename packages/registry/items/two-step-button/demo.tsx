import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { photo, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TwoStepButton } from './two-step-button';

export const controls = defineControls({
  tone: { type: 'select', label: 'Tone', options: ['danger', 'azure', 'ember'], default: 'danger' },
  timeout: { type: 'number', label: 'Timeout (s)', min: 2, max: 8, step: 1, default: 4 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const ALBUM: PhotoKey[] = ['whiteSands', 'huacachina', 'pastelTide', 'lonePalm'];

export default function TwoStepButtonDemo({
  tone,
  timeout,
  haptics,
}: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [done, setDone] = useState(false);
  const destructive = tone === 'danger';

  // The demo puts things back after a moment.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 2200);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <View style={[styles.row, { gap: 6 }]}>
        {ALBUM.map((key) => (
          <Image
            key={key}
            source={photo(key)}
            style={[
              styles.thumb,
              { borderRadius: radius.sm, opacity: done && destructive ? 0.25 : 1 },
            ]}
            accessibilityIgnoresInvertColors
          />
        ))}
      </View>
      <View style={{ gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          {done ? (destructive ? 'Album deleted' : 'Album shared') : 'Coastlines'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {done ? 'Back in a moment, for the demo.' : '48 photos · 212 MB · Shared with 3 people'}
        </Text>
      </View>
      <TwoStepButton
        key={tone}
        tone={tone}
        timeout={timeout * 1000}
        haptics={haptics}
        confirmLabel={destructive ? 'Delete' : 'Share'}
        disabled={done}
        onConfirm={() => setDone(true)}
      >
        {destructive ? 'Delete album' : 'Share with everyone'}
      </TwoStepButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row' },
  thumb: { flex: 1, aspectRatio: 1 },
});
