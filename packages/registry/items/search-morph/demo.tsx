import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SearchMorph } from './search-morph';

export const controls = defineControls({
  startOpen: { type: 'boolean', label: 'Start open', default: false },
});

const PLACES = Object.keys(photos) as PhotoKey[];

export default function SearchMorphDemo({ startOpen }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(startOpen);
  const q = query.trim().toLowerCase();
  const results = PLACES.filter(
    (k) => !q || `${photos[k].title} ${photos[k].place}`.toLowerCase().includes(q),
  ).slice(0, 4);

  return (
    <View
      key={String(startOpen)}
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
      <View style={styles.header}>
        {!open ? (
          <Text
            style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}
          >
            Explore
          </Text>
        ) : null}
        <SearchMorph
          value={query}
          onChangeText={setQuery}
          placeholder="Search places"
          open={open}
          onOpenChange={setOpen}
          style={styles.search}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.textSubtle,
                fontSize: font.size.xs,
                fontWeight: font.weight.semibold,
                marginBottom: 4,
              }}
            >
              {q ? `${results.length} results` : 'Suggested'}
            </Text>
            {results.map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                onPress={() => setQuery(photos[k].title)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderRadius: radius.md,
                    backgroundColor: pressed ? colors.surfaceRaised : undefined,
                  },
                ]}
              >
                <Image
                  source={photo(k)}
                  style={[styles.thumb, { borderRadius: radius.sm }]}
                  accessibilityIgnoresInvertColors
                />
                <View>
                  <Text style={{ color: colors.text, fontSize: font.size.md }}>
                    {photos[k].title}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                    {photos[k].place}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </SearchMorph>
      </View>
      {!open ? (
        <Image
          source={photo('snowRidge')}
          style={[styles.hero, { borderRadius: radius.lg }]}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  search: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6, minHeight: 56 },
  thumb: { width: 44, height: 44 },
  hero: { width: '100%', height: 160 },
});
