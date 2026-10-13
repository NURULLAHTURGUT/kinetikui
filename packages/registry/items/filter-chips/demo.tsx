import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FilterChips } from './filter-chips';

export const controls = defineControls({
  multiple: { type: 'boolean', label: 'Multiple', default: true },
});

const PLACES: { key: PhotoKey; tags: string[] }[] = [
  { key: 'mistLake', tags: ['lakes', 'forest'] },
  { key: 'whiteSands', tags: ['desert'] },
  { key: 'snowRidge', tags: ['mountains', 'snow'] },
  { key: 'lonePalm', tags: ['coast'] },
  { key: 'highlandLake', tags: ['lakes', 'mountains'] },
  { key: 'huacachina', tags: ['desert'] },
  { key: 'cloudForest', tags: ['forest', 'mountains'] },
  { key: 'pastelTide', tags: ['coast'] },
  { key: 'nightPeak', tags: ['mountains', 'snow'] },
];

const LABELS: Record<string, string> = {
  mountains: 'Mountains',
  lakes: 'Lakes',
  coast: 'Coast',
  desert: 'Desert',
  forest: 'Forest',
  snow: 'Snow',
};

export default function FilterChipsDemo({ multiple }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [value, setValue] = useState<string[]>(['mountains']);

  const options = useMemo(
    () =>
      Object.entries(LABELS).map(([v, label]) => ({
        value: v,
        label,
        count: PLACES.filter((p) => p.tags.includes(v)).length,
      })),
    [],
  );
  const shown = PLACES.filter((p) => value.length === 0 || p.tags.some((t) => value.includes(t)));

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
      <Text
        style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
      >
        Places
      </Text>
      <FilterChips
        key={String(multiple)}
        accessibilityLabel="Filter places"
        options={options}
        value={value}
        multiple={multiple}
        onValueChange={setValue}
      />
      <View style={styles.grid}>
        {shown.map((p) => (
          <View key={p.key} style={styles.cell}>
            <Image
              source={photo(p.key)}
              style={[styles.image, { borderRadius: radius.sm }]}
              accessibilityLabel={photos[p.key].title}
              accessibilityIgnoresInvertColors
            />
          </View>
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
        {shown.length} {shown.length === 1 ? 'place' : 'places'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: '33.333%', padding: 3 },
  image: { width: '100%', aspectRatio: 1 },
});
