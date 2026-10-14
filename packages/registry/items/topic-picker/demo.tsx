import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TopicPicker } from './topic-picker';

export const controls = defineControls({});

const TOPICS = [
  { id: 'flowers', label: 'Flowers', emoji: '🌸' },
  { id: 'weather', label: 'Weather', emoji: '☔' },
  { id: 'mushroom', label: 'Mushroom', emoji: '🍄' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'fruits', label: 'Fruits', emoji: '🍋' },
  { id: 'trending', label: 'Trending', emoji: '🔥' },
  { id: 'fish', label: 'Fish', emoji: '🐠' },
  { id: 'cactus', label: 'Cactus', emoji: '🌵' },
  { id: 'music', label: 'Music', emoji: '🎧' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'games', label: 'Games', emoji: '🎮' },
];

export default function TopicPickerDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [selected, setSelected] = useState<string[]>(['basketball', 'fruits']);
  const [sent, setSent] = useState<string | null>(null);
  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: space[3] }}>
      <TopicPicker
        topics={TOPICS}
        selected={selected}
        onChange={(s) => {
          setSelected(s);
          setSent(null);
        }}
        submit={{ label: 'Submit', onPress: (s) => setSent(`${s.length} topics saved`) }}
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        {sent ?? ' '}
      </Text>
    </View>
  );
}
