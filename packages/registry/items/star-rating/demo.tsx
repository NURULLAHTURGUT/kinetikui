import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { StarRating } from './star-rating';

export const controls = defineControls({
  allowHalf: { type: 'boolean', label: 'Half stars', default: false },
  size: { type: 'number', label: 'Star size', min: 24, max: 44, step: 4, default: 36 },
});

const WORDS = ['Tap to rate', 'Not for me', 'It was fine', 'Good', 'Great', 'Unforgettable'];

export default function StarRatingDemo({ allowHalf, size }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [rating, setRating] = useState(0);

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
      <View style={[styles.head, { gap: space[3] }]}>
        <Image
          source={photo('huacachina')}
          style={[styles.thumb, { borderRadius: radius.md }]}
          accessibilityIgnoresInvertColors
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
          >
            Desert lodge, Huacachina
          </Text>
          <View style={styles.average}>
            <StarRating value={4.5} allowHalf size={14} accessibilityLabel="Average rating" />
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>4.5 · 312 stays</Text>
          </View>
        </View>
      </View>
      <View style={[styles.rate, { borderTopColor: colors.border, paddingTop: space[4] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>How was your stay?</Text>
        <StarRating
          key={String(allowHalf)}
          accessibilityLabel="Your rating"
          value={rating}
          onValueChange={setRating}
          allowHalf={allowHalf}
          size={size}
        />
        <Text
          style={{
            color: rating ? colors.text : colors.textSubtle,
            fontSize: font.size.md,
            fontWeight: font.weight.medium,
          }}
        >
          {WORDS[Math.ceil(rating)]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56 },
  average: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rate: { alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
