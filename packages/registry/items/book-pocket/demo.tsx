import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { BookPocket, type PocketBook } from './book-pocket';

export const controls = defineControls({});

// Made-up titles with drawn covers.
const SHELVES: { genre: string; count: number; books: PocketBook[] }[] = [
  {
    genre: 'Fantasy',
    count: 8,
    books: [
      { id: 'a', title: 'Night Atlas', author: 'R. Vale' },
      { id: 'b', title: 'The Ember Crown', author: 'L. Moss' },
      { id: 'c', title: 'Salt & Silver', author: 'I. Kade' },
    ],
  },
  {
    genre: 'Romance',
    count: 5,
    books: [
      {
        id: 'd',
        title: 'Paper Hearts',
        author: 'M. Rowe',
        tones: ['hsl(330, 45%, 46%)', 'hsl(345, 50%, 20%)'],
      },
      {
        id: 'e',
        title: 'Late Bloom',
        author: 'J. Ash',
        tones: ['hsl(28, 70%, 58%)', 'hsl(12, 55%, 30%)'],
      },
      {
        id: 'f',
        title: 'Two Summers',
        author: 'A. Lark',
        tones: ['hsl(200, 45%, 46%)', 'hsl(215, 45%, 20%)'],
      },
    ],
  },
  {
    genre: 'Classic',
    count: 34,
    books: [
      {
        id: 'g',
        title: 'The Long Winter',
        author: 'E. Hart',
        tones: ['hsl(0, 60%, 40%)', 'hsl(0, 50%, 16%)'],
      },
      {
        id: 'h',
        title: 'A Quiet Sea',
        author: 'T. Fenn',
        tones: ['hsl(45, 60%, 55%)', 'hsl(30, 50%, 25%)'],
      },
      {
        id: 'i',
        title: 'Glass Orchard',
        author: 'C. Wren',
        tones: ['hsl(100, 25%, 38%)', 'hsl(120, 25%, 14%)'],
      },
    ],
  },
  {
    genre: 'Horror',
    count: 12,
    books: [
      {
        id: 'j',
        title: 'Hollow House',
        author: 'S. Crane',
        tones: ['hsl(270, 25%, 30%)', 'hsl(270, 30%, 10%)'],
      },
      {
        id: 'k',
        title: 'Static',
        author: 'N. Holt',
        tones: ['hsl(90, 60%, 42%)', 'hsl(150, 40%, 12%)'],
      },
      {
        id: 'l',
        title: 'The Thirteenth',
        author: 'D. Rook',
        tones: ['hsl(20, 20%, 30%)', 'hsl(20, 20%, 10%)'],
      },
    ],
  },
];

export default function BookPocketDemo() {
  const { colors, font, radius, space } = useKinetikTheme();
  const [genre, setGenre] = useState('All');
  const shown = SHELVES.filter((s) => genre === 'All' || s.genre === genre);
  return (
    <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', gap: space[4] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: space[1] }}>
          {['All', ...SHELVES.map((s) => s.genre)].map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityState={{ selected: genre === g }}
              onPress={() => setGenre(g)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: space[4],
                borderRadius: radius.pill,
                backgroundColor: genre === g ? colors.ember : 'transparent',
              }}
            >
              <Text
                style={{
                  color: genre === g ? colors.onEmber : colors.textMuted,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.medium,
                }}
              >
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }}>
        {shown.map((s) => (
          <BookPocket
            key={s.genre}
            title={s.genre}
            count={s.count}
            books={s.books}
            onPress={() => setGenre(s.genre)}
            style={{ width: '47%' }}
          />
        ))}
      </View>
    </View>
  );
}
