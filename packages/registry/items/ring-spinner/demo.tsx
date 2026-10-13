import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RingSpinner, type RingSpinnerStatus } from './ring-spinner';

export const controls = defineControls({
  size: { type: 'number', label: 'Size', min: 24, max: 72, step: 4, default: 48 },
  outcome: { type: 'select', label: 'Outcome', options: ['success', 'error'], default: 'success' },
});

export default function RingSpinnerDemo({ size, outcome }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [status, setStatus] = useState<RingSpinnerStatus>('loading');
  const [upload, setUpload] = useState(0);

  // The spinner settles after a moment; the upload ring counts up to full and starts again.
  useEffect(() => {
    if (status !== 'loading') return;
    const id = setTimeout(() => setStatus(outcome), 2400);
    return () => clearTimeout(id);
  }, [status, outcome]);
  useEffect(() => {
    const id = setTimeout(
      () => setUpload((u) => (u >= 1 ? 0 : Math.min(1, u + 0.17))),
      upload >= 1 ? 1400 : 500,
    );
    return () => clearTimeout(id);
  }, [upload]);

  const caption =
    status === 'loading'
      ? 'Syncing your library'
      : status === 'success'
        ? 'All synced'
        : 'Could not sync';

  return (
    <View style={{ gap: space[3] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${caption}. Sync again`}
        onPress={() => setStatus('loading')}
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
            gap: space[3],
          },
        ]}
      >
        <RingSpinner status={status} size={size} accessibilityLabel="Sync" />
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          {caption}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
          {status === 'loading' ? 'One moment…' : 'Tap to run it again'}
        </Text>
      </Pressable>
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: space[4],
            gap: space[3],
          },
        ]}
      >
        <RingSpinner
          progress={upload}
          status={upload >= 1 ? 'success' : 'loading'}
          size={32}
          accessibilityLabel="Upload"
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
          >
            Uploading 6 photos
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
            {upload >= 1 ? 'Uploaded' : `${Math.round(upload * 100)}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', paddingVertical: 28, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
});
