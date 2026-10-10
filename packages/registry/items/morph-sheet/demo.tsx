import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';
import { MorphSheet } from './morph-sheet';

export const controls = defineControls({
  blur: { type: 'boolean', label: 'Blur behind', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const PHOTOS = ['Harbour', 'Ridge', 'Market', 'Orchard', 'Tower', 'Dunes'];

export default function MorphSheetDemo({ blur, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [open, setOpen] = useState(false);
  const [stop, setStop] = useState(0);

  return (
    <View style={[styles.frame, { borderRadius: radius.xl, borderColor: colors.border }]}>
      <MorphSheet
        open={open}
        onOpenChange={setOpen}
        onSnap={setStop}
        blur={blur}
        haptics={haptics}
        snapPoints={[0.5, 0.92]}
        accessibilityLabel="Share photo"
        sheet={
          <View style={{ paddingHorizontal: space[5], gap: space[4] }}>
            <Text
              style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}
            >
              Share “Harbour”
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {stop === 0 ? 'Drag up for more options' : 'All options'}
            </Text>
            {['Message', 'Copy link', 'Save to album', 'Print', 'Add to story'].map((label) => (
              <View
                key={label}
                style={[styles.option, { borderColor: colors.border, borderRadius: radius.md }]}
              >
                <Text style={{ color: colors.text, fontSize: font.size.md }}>{label}</Text>
              </View>
            ))}
          </View>
        }
      >
        <View style={[styles.screen, { backgroundColor: colors.background, padding: space[4] }]}>
          <View style={styles.grid}>
            {PHOTOS.map((p, i) => (
              <View
                key={p}
                style={[
                  styles.tile,
                  {
                    borderRadius: radius.md,
                    backgroundColor: withAlpha(
                      i % 2 ? colors.ice : colors.ember,
                      0.18 + (i % 3) * 0.12,
                    ),
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.xs,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {p}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(true)}
            style={[styles.open, { backgroundColor: colors.ember, borderRadius: radius.pill }]}
          >
            <Text style={{ color: colors.onEmber, fontWeight: font.weight.bold }}>Share</Text>
          </Pressable>
        </View>
      </MorphSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 460, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  screen: { flex: 1, justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%', aspectRatio: 1, padding: 8, justifyContent: 'flex-end' },
  open: { alignSelf: 'center', paddingHorizontal: 28, height: 48, justifyContent: 'center' },
  option: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
