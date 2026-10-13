import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Pager } from './pager';

export const controls = defineControls({
  pageCount: { type: 'number', label: 'Pages', min: 3, max: 40, step: 1, default: 24 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function PagerDemo({ pageCount, haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [page, setPage] = useState(1);
  const current = Math.min(page, pageCount);
  const first = (current - 1) * 10 + 1;

  return (
    <View style={{ gap: space[4] }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: space[4],
          gap: space[2],
        }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: font.size.sm }}>
              Order #{first + i + 4000}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Shipped</Text>
          </View>
        ))}
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
          Showing {first}–{first + 9} of {pageCount * 10}
        </Text>
      </View>
      <Pager page={current} pageCount={pageCount} onPageChange={setPage} haptics={haptics} />
    </View>
  );
}
